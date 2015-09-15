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
 * Iterates along create_table_fns and performs each create table
 * fn until all are finished.
 *
 * @param create_table_fns Array containing at least one name/create table
 *        function pair
 *
 * @returns last create table promise result, probably less than useful data.
 */
function create_tables_promise(create_table_fns, index) {
  var create_fn = create_table_fns[index]

  if (create_fn) {
    console.log('Creating table for \'%s\'', create_fn[0])
    return create_fn[1]()
    .then(function (res) {
      if (create_table_fns.length > index + 1) {
        return create_tables_promise(create_table_fns, index + 1)
      } else {
        return res
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
function create_tables(dal) {
  var create_table_fns = []

  /* Note that order does matter since some tables have dependencies on
   * earlier tables */
  for (var key in dal) {
    if (dal[key].createTable) {
      create_table_fns.push([key, dal[key].createTable])
    }
  }

  if (create_table_fns.length) {
    return create_tables_promise(create_table_fns, 0)
    .then(function (res) {
      return res
    })
  }

  throw new Error('No table creation functions in data access layer')
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
    throw new Error(sprintf('No database could be initialized'))
  }

  return db.db
})
.then(function (db) {
  var dal = require('voicemail-data')(db, {
    logger: logger
  });

  return create_tables(dal)
})
.then(function (create_tables_res) {
  console.log('createtables script completed')
})
.catch(function (error) {
  console.error(error)
});
