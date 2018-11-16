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
