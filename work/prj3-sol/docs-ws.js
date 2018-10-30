'use strict';

const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const process = require('process');
const url = require('url');
const queryString = require('querystring');

const OK = 200;
const CREATED = 201;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;
const CONFLICT = 409;
const SERVER_ERROR = 500;


//Main URLs
const DOCS = '/docs';
const COMPLETIONS = '/completions';

//Default value for count parameter
const COUNT = 5;

/** Listen on port for incoming requests.  Use docFinder instance
 *  of DocFinder to access document collection methods.
 */
function serve(port, docFinder) {
  const app = express();
  app.locals.port = port;
  app.locals.finder = docFinder;
  setupRoutes(app);
  const server = app.listen(port, async function() {
    console.log(`PID ${process.pid} listening on port ${port}`);
  });
  return server;
}

module.exports = { serve };

function setupRoutes(app) {
  app.use(cors());            //for security workaround in future projects
  app.use(bodyParser.json()); //all incoming bodies are JSON

  //@TODO: add routes for required 4 services

  app.get(`${DOCS}/:id`, doGetContent(app));
  app.get(`${COMPLETIONS}?:text`, doGetComplete(app));
  app.get(`${DOCS}?:q`, doGetSearch(app));
  app.use(doErrors()); //must be last; setup for server errors
}

//@TODO: add handler creation functions called by route setup
//routine for each individual web service.  Note that each
//returned handler should be wrapped using errorWrap() to
//ensure that any internal errors are handled reasonably.

/** Return error handler which ensures a server error results in nice
 *  JSON sent back to client with details logged on console.
 */
function doErrors(app) {
  return async function(err, req, res, next) {
    res.status(SERVER_ERROR);
    res.json({ code: 'SERVER_ERROR', message: err.message });
    console.error(err);
  };
}


function doGetContent(app) {
    return errorWrap(async function (req, res) {
        try {
            console.log("inside doGet");
            const id = req.params.id;
            const results = await app.locals.finder.docContent(id);

            let printValue = {
                "content": results,
                "link": [{
                    "rel": "self",
                    "href": baseUrl(req, DOCS)
                }]
            };
            console.log(results);
            if (results.length === 0) {
                throw {
                    isDomain: true,
                    errorCode: 'NOT_FOUND',
                    message: `user ${id} not found`,
                };
            }
            else {
                res.json(printValue);
            }
        }
        catch (err) {
            const mapped = mapError(err);
            res.status(mapped.status).json(mapped);
        }
    });
}

function doGetComplete(app) {
    return errorWrap(async function(req, res) {
        try {

            const text = req.query;
            const results = await app.locals.finder.complete(text.text);


            if (results.length === 0) {
                throw {
                    isDomain: true,
                    errorCode: 'NOT_FOUND',
                    message: `user ${id} not found`,
                };
            }
            else {
                res.json(results);
            }
        }
        catch(err) {
            const mapped = mapError(err);
            res.status(mapped.status).json(mapped);
        }
    });
}


function doGetSearch(app) {
    return errorWrap(async function(req, res) {
        try {
            const text = req.query;
            const results = await app.locals.finder.find(text.q);
            let outputValue;
            let end;
            let start=0;
            let countV=0;
            let totalCount = results.length;
           // console.log("starting is :" + text.start);
            if(text.start === undefined){
                start = 0;
            }else{
                start = parseInt(text.start);
            }

            if(text.count === undefined){
                    end = start + COUNT;
                    countV = COUNT;
            }else{
                end = start + parseInt(text.count);
                countV = text.count;
            }

            let links = [{
                "rel": "self",
                "href": baseUrl(req, DOCS) + '?q=' + text.q.replace(' ', '%20') + "&start=" + start + "&count=" + countV
            }];
            //for previous link
                if(parseInt(text.start)>0) {
                    let startIndex = 0;
                    let countValue = 0;

                        if(text.count !== undefined) {
                            parseInt(text.start) - parseInt(text.count) <= 0 ?
                                startIndex = 0 :
                                startIndex = parseInt(text.start) - parseInt(text.count);
                            countValue = parseInt(text.count);
                        }else{ parseInt(text.start) - parseInt(COUNT) <= 0 ?
                            startIndex = 0 :
                            startIndex = parseInt(text.start) - parseInt(COUNT);
                            countValue = COUNT;
                        }

                    let linkValue = {
                        "rel": "previous",
                        "href": baseUrl(req, DOCS) + '?q=' + text.q.replace(' ', '%20') + "&start=" + startIndex + "&count=" + countValue
                     };

                    links.push(linkValue);
               ///     console.log(links);
                }

            //for next link
            if(end + 1 < totalCount ) {
                let countValue = 0;
                let startIndex = end + 1 ;
                if(text.count !== undefined) {
                    countValue = parseInt(text.count);
                }else{
                    countValue = COUNT;
                }

                let linkValue = {
                    "rel": "next",
                    "href": baseUrl(req, DOCS) + '?q=' + text.q.replace(' ', '%20') + "&start=" + startIndex + "&count=" + countValue
                };

                links.push(linkValue);
            //    console.log(links);
            }
            outputValue = {"results": [results.slice(start, end)],
                           "totalCount": totalCount,
                           "links":[links] };

            if (results.length === 0) {
                throw {
                    isDomain: true,
                    errorCode: 'NOT_FOUND',
                    message: `user ${id} not found`,
                };
            }
            else {
                res.json(outputValue);
            }
        }
        catch(err) {
            const mapped = mapError(err);
            res.status(mapped.status).json(mapped);
        }
    });
}
/** Set up error handling for handler by wrapping it in a
 *  try-catch with chaining to error handler on error.
 */
function errorWrap(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    }
    catch (err) {
      next(err);
    }
  };
}


/** Return base URL of req for path.
 *  Useful for building links; Example call: baseUrl(req, DOCS)
 */
function baseUrl(req, path='/') {
  const port = req.app.locals.port;
  const url = `${req.protocol}://${req.hostname}:${port}${path}`;
  return url;
}

/*************************** Mapping Errors ****************************/

const ERROR_MAP = {
    EXISTS: CONFLICT,
    NOT_FOUND: NOT_FOUND
};

/** Map domain/internal errors into suitable HTTP errors.  Return'd
 *  object will have a "status" property corresponding to HTTP status
 *  code.
 */
function mapError(err) {
    console.error(err);
    return err.isDomain
        ? { status: (ERROR_MAP[err.errorCode] || BAD_REQUEST),
            code: err.errorCode,
            message: err.message
        }
        : { status: SERVER_ERROR,
            code: 'INTERNAL',
            message: err.toString()
        };
}
