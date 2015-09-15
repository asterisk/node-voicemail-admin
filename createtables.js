/**
 * Voicemail Administrator Table Initialization Script.
 *
 * @module voicemail-admin
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan R. Rose <jrose@digium.com>
 */

'use strict';

var logger = require('voicemail-logging').create(
  require('./config.json'),
  'voicemail-admin-createtables');

var errorFunc = logger.error;
var infoFunc = logger.info;

/**
 * Iterates along createTableFunctions and performs each create table
 * fn until all are finished.
 *
 * @param createTableFunctions Array containing at least one name/create table
 *        function pair
 *
 * @returns last create table promise result, probably less than useful data.
 */
function createTablesPromise(createTableFunctions, index) {
  var createFN = createTableFunctions[index];

  if (createFN) {
    console.log('Creating table for \'%s\'', createFN[0]);
    return createFN[1]()
    .then(function (res) {
      if (createTableFunctions.length > index + 1) {
        return createTablesPromise(createTableFunctions, index + 1);
      } else {
        return res;
      }
    });
  }
}

/**
 * Starts the process of creating every table in the data access layer
 *
 * @param dal Data Access Layer object that should be provided from
 *        voicemail-data module
 *
 * @returns a promise that all the tables from the dal are created
 */
function createTables(dal) {
  var createTableFunctions = [];

  /* Note that order does matter since some tables have dependencies on
   * earlier tables */
  for (var key in dal) {
    if (dal[key].createTable) {
      createTableFunctions.push([key, dal[key].createTable]);
    }
  }

  if (createTableFunctions.length) {
    return createTablesPromise(createTableFunctions, 0)
    .then(function (res) {
      return res;
    });
  }

  throw new Error('No table creation functions in data access layer');
}

/* Write error messages to the console as well as to the logger */
logger.error = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  console.error.apply(this, args);
  errorFunc.apply(this, args);
};

/* Write info messages to the console as well as to the logger */
logger.info = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  console.log.apply(this, args);
  infoFunc.apply(this, args);
};

var initializer = require('./lib/voicemail-admin-init.js');

initializer.getDBConfig(logger)
.then(function (db) {
  if (!db) {
    throw new Error('No database could be initialized');
  }

  return db.db;
})
.then(function (db) {
  var dal = require('voicemail-data')(db, {
    logger: logger
  });

  return createTables(dal);
})
.then(function (createTablesResult) {
  console.log('createtables script completed');
})
.catch(function (error) {
  console.error(error);
});
