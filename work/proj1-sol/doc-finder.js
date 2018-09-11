const {inspect} = require('util'); //for debugging

'use strict';

class DocFinder {
    /** Constructor for instance of DocFinder. */
    constructor() {
        this.noiseWordsIndex = new Set();
        this.finalWords = new Set();
        this.map1 = new Map();
        this.bookLineMap = new Map();
    }

    /** Return array of non-noise normalized words from string content.
     *  Non-noise means it is not a word in the noiseWords which have
     *  been added to this object.  Normalized means that words are
     *  lower-cased, have been stemmed and all non-alphabetic characters
     *  matching regex [^a-z] have been removed.
     */

    words(content) {
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
                    this.finalWords.add(keyword);
                    localWords.push(keyword);
                }

            }

        }
        return localWords;
    }

    /** Add all normalized words in noiseWords string to this as
     *  noise words.
     */

    addNoiseWords(noiseWords) {
        this.noiseWordsIndex = new Set(noiseWords.split(/\s+/));
    }

    addContent(name, content){
     //   let wordsIndex = content.split(/\s+/);

        let wordsIndexForLine = content.split(/\n+/);
        //map for line offset with respect to the book
        if(!this.bookLineMap.has(name)) {
            this.bookLineMap.set(name, wordsIndexForLine);
        }

        const lengthOfBook = wordsIndexForLine.length;
        //selecting a line from wordsIndexForLine
        for(let j = 0 ; j < lengthOfBook ; j++) {
            let wordsIndex = wordsIndexForLine[j].split(/\s+/);
            const length = wordsIndex.length;

            //iterating over selected line words
            for (let i = 0; i < length; i++) {
                const normalizedWord = this.words(wordsIndex[i]).toString();
                if (!normalizedWord)
                    continue;
                if (!this.map1.has(normalizedWord)) {
                    //when the word and the book is new
                    this.map1.set(normalizedWord, new Map().set(name, [1, j]));
                } else {
                    const tempMap = this.map1.get(normalizedWord);
                    if (tempMap.has(name)) {
                        //when the word and book are in map
                        this.map1.set(normalizedWord, tempMap.set(name, [tempMap.get(name)[0] + 1,tempMap.get(name)[1]] ));
                    } else {
                        //when the word is in map but book is different
                        this.map1.set(normalizedWord, tempMap.set(name, [1,j]));
                    }
                }
            }
        }
    }

    /** Given a list of normalized, non-noise words search terms,
     *  return a list of Result's  which specify the matching documents.
     *  Each Result object contains the following properties:
     *     name:  the name of the document.
     *     score: the total number of occurrences of the search terms in the
     *            document.
     *     lines: A string consisting the lines containing the earliest
     *            occurrence of the search terms within the document.  Note
     *            that if a line contains multiple search terms, then it will
     *            occur only once in lines.
     *  The Result's list must be sorted in non-ascending order by score.
     *  Results which have the same score are sorted by the document name
     *  in lexicographical ascending order.
     *
     */
    find(terms) {
        let results = [];
        if (null != terms) {
            const len = terms.length;
            for (let k = 0; k < len; k++) {
                const word = terms[k];
                if (this.map1.has(word)) {
                    let bookNames = this.map1.get(word).keys();
                    //array of objects

                    for (let name of bookNames) {
                        let resultObject = new Result();
                        resultObject.name = name;
                        resultObject.score = this.map1.get(word).get(name)[0];
                        let lineIndex = this.map1.get(word).get(name)[1];
                        resultObject.lines = this.bookLineMap.get(name)[lineIndex] + "\n";
                        results.push(resultObject);
                    }
                }
            }
        }
        return results;
    }

    /** Given a text string, return a ordered list of all completions of
     *  the last word in text.  Returns [] if the last char in text is
     *  not alphabetic.
     */
    complete(text) {
        let wordsFound = [];
        if (null != text) {
            let arrayKey =  Array.from(this.map1.keys());
            let length = arrayKey.length;
            for (let i = 0 ; i < length ; i++) {
                if (arrayKey[i].includes(text)) {
                    wordsFound.push(arrayKey[i]);
                }
            }
        }
        return wordsFound;
    }


} //class DocFinder

module.exports = DocFinder;

/** Regex used for extracting words as maximal non-space sequences. */
const WORD_REGEX = /\S+/g;

/** A simple class which packages together the result for a
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
