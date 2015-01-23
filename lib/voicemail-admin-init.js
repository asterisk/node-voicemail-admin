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
var writeFile = Q.denodeify(fs.writeFile);

var dbConfigName = 'database.json';

function getDBConfig(logger) {
  var fsReadFile = Q.denodeify(fs.readFile);

  return fsReadFile('database.json')
  .then(function (result) {
    return JSON.parse(result);
  })
  .catch(function (err) {
    /* ENOENT just means the file doesn't exist and we need to create it. */
    if (err.code !== 'ENOENT') {
      return;
    }
  });
}

function createDBConfig(logger) {
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

  var prompt = require('prompt');
  var getPrompt = Q.denodeify(prompt.get);
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

    logger.info('%s saved', dbConfigName);
    logger.info('Exit now and run \'node createtables.js\' if the database ' +
                'is uninitialized.');
    return dbConfig.db;
  });
}

/**
 * Returns module functions.
 *
 * @returns {object} module - module functions
 */
module.exports = {
  getDBConfig: getDBConfig,
  createDBConfig: createDBConfig
};
