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
        this.allNoiseWords = [] ;
        this.wordIndexObject = {};

    }

    /** This routine is used for all asynchronous initialization
     *  for instance of DocFinder.  It must be called by a client
     *  immediately after creating a new instance of this.
     */
    async init() {
        this.client = await mongo.connect(this.url, MONGO_OPTIONS);
        this.db = this.client.db(this.dbName);
        this.lineIndexTable = this.db.collection(LINE_INDEX_TABLE);
        this.wordsIndexTable = this.db.collection(WORDS_INDEX_TABLE);
        this.noiseWordsTable = this.db.collection(NOISE_WORDS_TABLE);
        this.contentsTable = this.db.collection(CONTENT_TABLE);
    }

    /** Release all resources held by this doc-finder.  Specifically,
     *  close any database connections.
     */
    async close() {
        this.client.close();
    }

    /** Clear database */
    async clear() {
        //TODO
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
                  //  this.finalWords.add(keyword);
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
     //   const noiseDocs = noiseArray.map(n => ({_id: n}));
      //  await this.noiseWordsTable.updateOne({_id: NOISEWORDSID},{$set: {'words': noiseArray}},{upsert: true});
        const noiseDocs = noiseArray.map(n => ({_id: n}));
        await this.noiseWordsTable.insertMany(noiseDocs);
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
        await this.pushLineIndex(name, wordsIndexForLine);
        await this.pushContents(name, contentText);
        //get existing values from database
        //this.wordIndexObject = await this.getMapFromDatabase();
        //set those values in finalMap and pass it to operations

        this.wordIndexObject = await this.operations(lengthOfBook, wordsIndexForLine, name, this.wordIndexObject);
        //update finalMap into database
        await this.pushWords(this.wordIndexObject);

    }
/*    async getMapFromDatabase() {
        //get the word index collections
        let existingWordObject = {};
        try {
            //let cursor = this.wordsIndexTable.find(WORDS_INDEX_TABLE).toArray(function(err, documents){});
            this.exisitingWordIndex  = await this.wordsIndexTable.findOne({'_id': NOISEWORDSID});
            let objectKeys =  Object.keys(this.exisitingWordIndex);
            let length = objectKeys.length;
            for(let i = 1 ; i <=length ;i++){
                existingWordObject[objectKeys[i]] = this.exisitingWordIndex[objectKeys[i]];
            }
            //convert array into object
        } catch (e) {
            console.error(e);
        }
       return existingWordObject;
    }*/

  async operations(lengthOfBook, wordsIndexForLine, name, object) {
        //get all noise words start
        this.allNoiseWords  = await this.noiseWordsTable.find({}).toArray();
         this.finalArray = this.allNoiseWords.map(function (obj) {
              return obj._id;
          });
        this.noiseWordsIndex = new Set(this.finalArray);
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
                  object[normalizedWord][name] = {score: 1,  lineIndex: j};
              } else {

                  if (object[normalizedWord].hasOwnProperty(name)) {
                      //when the word and book are in map
                      let score  = object[normalizedWord][name].score;
                      object[normalizedWord][name]['score'] = ++score;
                  } else {
                      //when the word is in map but book is different
                      object[normalizedWord][name] = {};
                      object[normalizedWord][name] = {score: 1,  lineIndex: j};
                  }
              }
          }
      }
        //old code ends
    return object;
    }
   async pushWords(wordIndexObject) {
        try {
          //  let feedback = this.wordsIndexTable.updateOne({'_id': name}, {$set: {'wordIndex': index}}, {upsert : true});
           // await this.wordsIndexTable.insertMany([wordIndexObject]);
            for(let word of Object.entries(wordIndexObject)) {
                let struct = word[1];
                await this.wordsIndexTable.updateOne({'_id': word[0]}, {$set:{'bookname':struct}}, {upsert: true});
            }
        } catch (e) {
            console.error(e);
        }
    }
   async pushLineIndex(name, wordsIndexForLine) {
        try {
            this.lineIndexTable.updateOne({'_id': name}, {$set: {'contentText': wordsIndexForLine}}, {upsert : true});
        } catch (e) {
            console.error(e);
        }
    }

    pushContents(name, wordsIndexForLine) {
        try {
            this.contentsTable.updateOne({'_id': name}, {$set: {'contentText': wordsIndexForLine}}, {upsert : true});
        } catch (e) {
            console.error(e);
        }
    }
    /** Return contents of document name.  If not found, throw an Error
     *  object with property code set to 'NOT_FOUND' and property
     *  message set to `doc ${name} not found`.
     */
    async docContent(name) {
        let doc =  await this.contentsTable.findOne({_id: name});
        if(doc){
            return doc.contentText.toString();
        }
        else{
            const err = new Error('doc ${name} not found');
            err.code = 'NOT FOUND';
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
        return [];
    }

    /** Given a text string, return a ordered list of all completions of
     *  the last normalized word in text.  Returns [] if the last char
     *  in text is not alphabetic.
     */
    async complete(text) {
        return [];
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
        this.name = name; this.score = score; this.lines = lines;
    }

    toString() { return `${this.name}: ${this.score}\n${this.lines}`; }
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

const LINE_INDEX_TABLE = 'line_index_table';
const CONTENT_TABLE = 'content_table';
const WORDS_INDEX_TABLE = 'words_index_table';
const NOISE_WORDS_TABLE = 'noise_words_table';
const NOISEWORDSID = 'n';
