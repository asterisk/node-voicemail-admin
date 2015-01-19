/**
 * Voicemail Admin Application Configuration Prompt.
 *
 * @module app
 * @copyright 2014, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var Q = require('q');
var fs = require('fs');
var dbConfigName = 'database.json';

function onStart(logger) {

  var fsReadFile = Q.denodeify(fs.readFile);

  return fsReadFile('database.json')
  .then(function (result) {
    return 0;
  })
  .catch(function (err) {
    if (err.code !== 'ENOENT') {
      return -1;
    }

    var prompt = require('prompt');
    var getPrompt = Q.denodeify(prompt.get);
    var writeFile = Q.denodeify(fs.writeFile);

    var schema = {
      properties: {
        provider: {
          required: true
        },
        connectionString: {
          required: true
        }
      }
    };

    var dbConfig = {};

    prompt.start();

    return getPrompt(schema)
    .then(function (result) {
      dbConfig.db = result;
      return writeFile(dbConfigName, JSON.stringify(dbConfig));
    })
    .then(function (err) {
      if (err) {
        throw new Error(err);
      }

      console.log('%s saved', dbConfigName);
      console.log('Run \'node createtables.js\' if the database is ' +
                'uninitialized.');
      return -1;
    })
    .catch(function (err) {
      logger.error(err);
    });
  });
}

/**
 * Returns module functions.
 *
 * @returns {object} module - module functions
 */
module.exports = {
  onStart: onStart
};
