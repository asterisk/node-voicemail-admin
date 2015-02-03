/**
 * Voicemail Admin application bootstrap.
 *
 * @module app
 * @copyright 2014, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var logger = require('voicemail-logging').create(
  require('./config.json'),
  'voicemail-admin');

var errorFunc = logger.error;
var infoFunc = logger.info;

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
    return initializer.createDBConfig(logger);
  }

  return db.db;
})
.then(function (db) {
  var app = require ('./lib/voicemail-admin.js');
  var dal = require('voicemail-data')(db, {
    logger: logger
  });

  return app.create({logger: logger, dal: dal});
})
.catch(function (err) {
  logger.error(err);
  process.exit(1);
});
