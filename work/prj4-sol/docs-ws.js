'use strict';

const axios = require('axios');

function DocsWs(baseUrl) {
  this.docsUrl = `${baseUrl}/docs`;
}

module.exports = DocsWs;

//@TODO add wrappers to call remote web services.
DocsWs.prototype.getContent = async function(name) {
    try {
        const response = await axios.get(`${this.docsUrl}/${name}`);
        return response.data;
    }
    catch (err) {
        console.error(err);
        throw (err.response && err.response.data) ? err.response.data : err;
    }
};

DocsWs.prototype.addContent = async function(name, content) {
    try {
        console.log("docswsName "+name);
        console.log("docsContent "+content);
        const response = await axios.post(`${this.docsUrl}`, {name, content});
        return response.data;
    }
    catch (err) {
        console.error(err);
        throw (err.response && err.response.data) ? err.response.data : err;
    }
};


DocsWs.prototype.searchDocs = async function(searchTerms, start) {
    try {
        const url = this.docsUrl;
        const params ={q: searchterms};
        if(start){
            params.start = start;
        }
        const response = await axios.get(url, {params});
        return response.data;
    }
    catch (err) {
        console.error(err);
        throw (err.response && err.response.data) ? err.response.data : err;
    }
};
