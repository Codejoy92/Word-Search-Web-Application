const assert = require('assert');
const mongo = require('mongodb').MongoClient;
const {inspect} = require('util'); //for debugging

'use strict';

/** This class is expected to persist its state.  Hence when the
 *  class is created with a specific database url, it is expected
 *  to retain the state it had when it was last used with that URL.
 */
class DocFinder {

    /** Constructor for instance of DocFinder. The dbUrl is
     *  expected to be of the form mongodb://SERVER:PORT/DB
     *  where SERVER/PORT specifies the server and port on
     *  which the mongo database server is running and DB is
     *  name of the database within that database server which
     *  hosts the persistent content provided by this class.
     */
    constructor(dbUrl) {
        let separator = dbUrl.lastIndexOf("/");
        this.url = dbUrl.substring(0, separator);
        this.dbName = dbUrl.slice(separator + 1);
        this.noiseWordsIndex = new Set();
        this.allNoiseWords = [];
        this.wordIndexObject = {};
    }

    /** This routine is used for all asynchronous initialization
     *  for instance of DocFinder.  It must be called by a client
     *  immediately after creating a new instance of this.
     */
    async init() {
        this.client = await mongo.connect(this.url, MONGO_OPTIONS);
        this.db = this.client.db(this.dbName);
        this.wordsIndexTable = this.db.collection(WORDS_INDEX_TABLE);
        this.noiseWordsTable = this.db.collection(NOISE_WORDS_TABLE);
        this.contentsTable = this.db.collection(CONTENT_TABLE);
    }

    /** Release all resources held by this document-finder.  Specifically,
     *  close any database connections.
     */
    async close() {
        await this.client.close(true, function () {
        });
    }

    /** Clear database */
    async clear() {
        let collections = await this.db.collections();
        for (let collection of collections) {
            await collection.drop();
        }
    }

    /** Return an array of non-noise normalized words from string
     *  contentText.  Non-noise means it is not a word in the noiseWords
     *  which have been added to this object.  Normalized means that
     *  words are lower-cased, have been stemmed and all non-alphabetic
     *  characters matching regex [^a-z] have been removed.
     */
    async words(content) {
        const splitWords = content.match(WORD_REGEX);
        let localWords = [];
        if (null != splitWords) {
            for (let word of splitWords) {
                if (word === null)
                    continue;
                const keyword = normalize(word);
                if (keyword === null)
                    continue;
                if (!this.noiseWordsIndex.has(keyword)) {
                    localWords.push(keyword);
                }
            }
        }
        return localWords;
    }

    /** Add all normalized words in the noiseText string to this as
     *  noise words.  This operation should be idempotent.
     */
    async addNoiseWords(noiseText) {
        this.noiseWordsIndex = new Set(noiseText.split(/\s+/));
        const noiseArray = Array.from(this.noiseWordsIndex);
        await this.noiseWordsTable.updateOne({'_id': 'n'}, {$set: {'noiseWords': noiseArray}}, {upsert: true});
    }

    /** Add document named by string name with specified content string
     *  contentText to this instance. Update index in this with all
     *  non-noise normalized words in contentText string.
     *  This operation should be idempotent.
     */
    async addContent(name, contentText) {
        if (!contentText.endsWith('\n')) contentText = contentText + '\n';
        let wordsIndexForLine = contentText.split(/\n+/);
        const lengthOfBook = wordsIndexForLine.length;
        //updating line indexing in database
        await this.pushContents(name, contentText);
        this.wordIndexObject = await this.operations(lengthOfBook, wordsIndexForLine, name, this.wordIndexObject);
        await this.pushWords(this.wordIndexObject);
    }

    async operations(lengthOfBook, wordsIndexForLine, name, object) {
        //get all noise words start
        this.allNoiseWords = await this.noiseWordsTable.find({}).toArray();
        this.finalArray1 = this.allNoiseWords.map(function (obj) {
            return obj.noiseWords;
        });
        let finalArray = this.finalArray1[0];
        this.noiseWordsIndex = new Set(finalArray);
        //get all noise words ends

        //old code starts
        for (let j = 0; j < lengthOfBook; j++) {
            let wordsIndex = wordsIndexForLine[j].split(/\s+/);
            const length = wordsIndex.length;

            //iterating over selected line words
            for (let i = 0; i < length; i++) {
                const word = await this.words(wordsIndex[i]);
                const normalizedWord = word.toString();

                if (!normalizedWord)
                    continue;
                if (!object.hasOwnProperty(normalizedWord)) {
                    //when the word and the book is new
                    object[normalizedWord] = {};
                    object[normalizedWord][name] = {score: 1, lineIndex: j};
                } else {

                    if (object[normalizedWord].hasOwnProperty(name)) {
                        //when the word and book are in map
                        let score = object[normalizedWord][name].score;
                        object[normalizedWord][name]['score'] = ++score;
                    } else {
                        //when the word is in map but book is different
                        object[normalizedWord][name] = {};
                        object[normalizedWord][name] = {score: 1, lineIndex: j};
                    }
                }
            }
        }
        //old code ends
        return object;
    }

    async pushWords(wordIndexObject) {
        try {
            for (let word of Object.entries(wordIndexObject)) {
                let struct = word[1];
                await this.wordsIndexTable.updateOne({'_id': word[0]}, {$set: {'bookname': struct}}, {upsert: true});
            }
        } catch (e) {
            console.error(e);
        }
    }

    async pushContents(name, wordsIndexForLine) {
        try {
            await this.contentsTable.updateOne({'_id': name}, {$set: {'contentText': wordsIndexForLine}}, {upsert: true});
        } catch (e) {
            console.error(e);
        }
    }

    /** Return contents of document name.  If not found, throw an Error
     *  object with property code set to 'NOT_FOUND' and property
     *  message set to `document ${name} not found`.
     */
    async docContent(name) {
        const doc = await this.contentsTable.findOne({_id: name});
        if (doc) {
            return doc.contentText.toString();
        }
        else {
            let text = 'document ' + name + ' not found';
            const err = new Error(text);
            err.code = 'NOT_FOUND';
            throw err;
        }
    }

    /** Given a list of normalized, non-noise words search terms,
     *  return a list of Result's  which specify the matching documents.
     *  Each Result object contains the following properties:
     *
     *     name:  the name of the document.
     *     score: the total number of occurrences of the search terms in the
     *            document.
     *     lines: A string consisting the lines containing the earliest
     *            occurrence of the search terms within the document.  The
     *            lines must have the same relative order as in the source
     *            document.  Note that if a line contains multiple search
     *            terms, then it will occur only once in lines.
     *
     *  The returned Result list must be sorted in non-ascending order
     *  by score.  Results which have the same score are sorted by the
     *  document name in lexicographical ascending order.
     *
     */
    async find(terms) {
        let results = [];

        if (null != terms) {

            let resultObject;
            let termValue = terms.length;
            let document = [];
            //code to get all unique books start
            let allBookNames = [];
            let flag =0;
            for (let k = 0; k < termValue; k++) {
                let value = await this.wordsIndexTable.findOne({_id: terms[k]});
                if (value) {
                    document.push(value);

                    let book = document[k].bookname;
                    this.bookvalues = Object.getOwnPropertyNames(book);
                    for (let entry of this.bookvalues) {
                        if (!allBookNames.includes(entry))
                            allBookNames.push(entry);
                    }
                }else{
                    document.push(null);
                }
            }
            //code to get all unique books end

            let books = allBookNames.length;
            for (let i = 0; i < books; i++) {
                resultObject = new Result();
                resultObject.name = allBookNames[i];
                let score = 0;
                let lines = [];
                let lineMap = new Map();
                let bookArray = [];
                for (let j = 0; j < termValue; j++) {
                    //get all books for particular word
                    if (document[j]) {
                        bookArray = document[j].bookname;
                        let bookName = Object.getOwnPropertyNames(bookArray);
                        //updating score and lineIndex values for result object
                        if (typeof(bookArray) !== "undefined" && bookName.includes(allBookNames[i])) {
                            for (let variable of bookName) {
                                if (variable === allBookNames[i]) {
                                    score = score + bookArray[allBookNames[i]].score;
                                }
                            }
                            const lineIndex = bookArray[allBookNames[i]].lineIndex;
                            //     const line = await this.lineIndexTable.findOne({_id: allBookNames[i]});
                            const line = await this.contentsTable.findOne({_id: allBookNames[i]});
                            let LineArray = line.contentText.split(/\n+/);
                            const finalLine = LineArray[lineIndex] + "\n";
                            //  const finalLine = line.contentText[lineIndex] + "\n";

                            //checking if line is already taken
                            if (!lines.includes(finalLine)) {
                                lineMap.set(lineIndex, finalLine);
                            }
                        }
                    }
                }
                let lineNo = Array.from(lineMap.keys());
                lineNo.sort(function (a, b) {
                    return a - b
                });
                //push all the lines in lineIndex
                let arrayLength = lineNo.length;
                for (let k = 0; k < arrayLength; k++) {
                    lines.push(lineMap.get(lineNo[k]));
                }
                resultObject.score = score;
                resultObject.lines = lines;
                results.push(resultObject);
            }
        }
        results.sort(compareResults);
        return results;
    }

    /** Given a text string, return a ordered list of all completions of
     *  the last normalized word in text.  Returns [] if the last char
     *  in text is not alphabetic.
     */
    async complete(text) {
        if (!text.match(/[a-zA-Z]$/)) {
            return [];
        }
        let word = text.split(/\s+/).map(w => normalize(w)).slice(-1)[0];
        let doc = await this.wordsIndexTable.find({}).toArray();
        let docValues = doc.map(function (value) {
            return value._id;
        });
        return docValues.filter((w) => w.startsWith(word));
    }


}//class DocFinder

module.exports = DocFinder;

//Add module global functions, constants classes as necessary
//(inaccessible to the rest of the program).

//Used to prevent warning messages from mongodb.
const MONGO_OPTIONS = {
    useNewUrlParser: true
};

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple utility class which packages together the result for a
 *  document search as documented above in DocFinder.find().
 */
class Result {
    constructor(name, score, lines) {
        this.name = name;
        this.score = score;
        this.lines = lines;
    }

    toString() {
        return `${this.name}: ${this.score}\n${this.lines}`;
    }
}

/** Compare result1 with result2: higher scores compare lower; if
 *  scores are equal, then lexicographically earlier names compare
 *  lower.
 */
function compareResults(result1, result2) {
    return (result2.score - result1.score) ||
        result1.name.localeCompare(result2.name);
}

/** Normalize word by stem'ing it, removing all non-alphabetic
 *  characters and converting to lowercase.
 */
function normalize(word) {
    return stem(word.toLowerCase()).replace(/[^a-z]/g, '');
}

/** Place-holder for stemming a word before normalization; this
 *  implementation merely removes 's suffixes.
 */
function stem(word) {
    return word.replace(/\'s$/, '');
}

const CONTENT_TABLE = 'content_table';
const WORDS_INDEX_TABLE = 'words_index_table';
const NOISE_WORDS_TABLE = 'noise_words_table';
