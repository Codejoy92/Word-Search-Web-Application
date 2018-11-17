'use strict';

const express = require('express');
const upload = require('multer')();
const fs = require('fs');
const mustache = require('mustache');
const Path = require('path');
const { URL } = require('url');
const querystring = require('querystring');
const STATIC_DIR = 'statics';
const TEMPLATES_DIR = 'templates';

function serve(port, base, model) {
  const app = express();
  app.locals.port = port;
  app.locals.base = base;
  app.locals.model = model;
  process.chdir(__dirname);
  app.use(base, express.static(STATIC_DIR));
  setupTemplates(app, TEMPLATES_DIR);
  setupRoutes(app);
  app.listen(port, function() {
    console.log(`listening on port ${port}`);
  });
}


module.exports = serve;

/******************************** Routes *******************************/

function setupRoutes(app) {
  //@TODO add appropriate routes
    const base = app.locals.base;
    app.get('/',redirect(app));
    app.get(`${base}/add.html`,redirectAdd(app));
    app.post(`${base}/add`,upload.single('file'), redirectAddPost(app));
    app.get(`${base}/search.html`,redirectSearch(app));
    app.get(`${base}/:name`,redirectGet(app));

}

/*************************** Action Routines ***************************/

//@TODO add action routines for routes + any auxiliary functions.
  function redirect(app){
    return async function (req, res){
      res.redirect('/docs');
    }
  }

  function redirectAddPost(app){
      return async function (req, res) {
              let fileName = req.file;
              let checkName = fileName.originalname;
              let name = Path.basename(checkName, '.txt');
              let content = req.file.buffer.toString('utf8');
              let result = await app.locals.model.addContent(name, content);
              res.redirect(relativeUrl(req, `../${name}`));
      }
  }

  function redirectGet(app){
      return async function(req, res) {
          let model;
          const name = req.params.name;
          try {
              const body = await app.locals.model.getContent(name);
              model = {name: name,
                       content:body.content,
                        base: app.locals.base };
          }
          catch (err) {
              console.error(err);
              model = {base, errors:[err.toString() || err.message ]};
          }
          const html = doMustache(app, 'content', model);
          res.send(html);
      };
  }
    function redirectAdd(app) {
        return async function (req, res) {
            const view = {base: app.locals.base};
            const html = doMustache(app, 'add', view);
            res.send(html);
        };
    }
  function redirectSearch(app) {
      return async function (req, res) {
	  let results = {};
          //let key = req.query && Object.keys(req.query) && Object.keys(req.query).length;
          let isSubmit1 = req.query;
	  let isSubmit = isSubmit1.submit
	  let errors = undefined;
	  let search = getNonEmptyValues(req.query);
	  let {q, start} = search;

	  if(isSubmit){
		//errors = validate(search);
		//if (Object.keys(search).length == 0) {
		//	const msg = 'at least one search parameter must be specified';
		//	errors = Object.assign(errors || {}, { _: msg });
     		// }
		//if(!errors){
		//}

          	let values ={};
		try{
          		let myResults = await app.locals.model.searchDocs(q, start);
			console.log(myResults);
            let finalObject = {};
			if(myResults){
            let searchTerms = search.q;
            let Terms = new Set(searchTerms.toLowerCase().split(/\W+/));
            //for values
			values.myResults = myResults.results.map(result => {
                  		let lines = result.line.map(function(line) {
				        //console.log(line);
                      		return line.replace(/\w+/g, w => {
                          		const word = Terms.has(w.toLowerCase());
                          		if(word){
                                 return `<span class="search-term">${w}</span>`;
                                }else{
                          		    return w;
                                }
                  		    });
                  		});
                  			const href = relativeUrl(req, `../${result.name}`);
                  			return Object.assign({}, result, {lines, href});
              			});

			//for links
             		     results.link.forEach(link => {
               			   if (link.rel === 'next' || link.rel === 'previous') {
                		      let params = {q: searchTerms, start: link.start};
                		      finalObject[link.rel] = relativeUrl(req, '', params);
                		  }
		              });
		  	 }
		}
		catch (err) {
         	 	console.error(err);
	  		errors = wsErrors(err);
		}
		return;

	  }

          const self = 'search.html';
          const model = {base : app.locals.base, results};
          const html = doMustache(app, 'search', model);
          res.send(html);
      };
  }

/************************ General Utilities ****************************/

/** return object containing all non-empty values from object values */
function getNonEmptyValues(values) {
  const out = {};
  Object.keys(values).forEach(function(k) {
    const v = values[k];
    if (v && v.trim().length > 0) out[k] = v.trim();
  });
  return out;
}


/** Return a URL relative to req.originalUrl.  Returned URL path
 *  determined by path (which is absolute if starting with /). For
 *  example, specifying path as ../search.html will return a URL which
 *  is a sibling of the current document.  Object queryParams are
 *  encoded into the result's query-string and hash is set up as a
 *  fragment identifier for the result.
 */
function relativeUrl(req, path='', queryParams={}, hash='') {
  const url = new URL('http://dummy.com');
  url.protocol = req.protocol;
  url.hostname = req.hostname;
  url.port = req.socket.address().port;
  url.pathname = req.originalUrl.replace(/(\?.*)?$/, '');
  if (path.startsWith('/')) {
    url.pathname = path;
  }
  else if (path) {
    url.pathname += `/${path}`;
  }
  url.search = '';
  Object.entries(queryParams).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });
  url.hash = hash;
  return url.toString();
}

/************************** Template Utilities *************************/


/** Return result of mixing view-model view into template templateId
 *  in app templates.
 */
function doMustache(app, templateId, view) {
  const templates = { footer: app.templates.footer };
  return mustache.render(app.templates[templateId], view, templates);
}

/** Add contents all dir/*.ms files to app templates with each 
 *  template being keyed by the basename (sans extensions) of
 *  its file basename.
 */
function setupTemplates(app, dir) {
  app.templates = {};
  for (let fname of fs.readdirSync(dir)) {
    const m = fname.match(/^([\w\-]+)\.ms$/);
    if (!m) continue;
    try {
      app.templates[m[1]] =
	String(fs.readFileSync(`${TEMPLATES_DIR}/${fname}`));
    }
    catch (e) {
      console.error(`cannot read ${fname}: ${e}`);
      process.exit(1);
    }
  }
}

