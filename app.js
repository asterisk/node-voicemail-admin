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

/* Increase level of streams that write to standard out for info/error
 * loggers so that these streams are ignored. Bit of a hack. */
for (var index in logger.streams) {
  if (logger.streams[index].type === 'stream') {
    logger.streams[index].level = 999;
  }
}

/* Write error messages to the console as well as to the logger */
logger.error = function () {
  var args = Array.prototype.slice.call(arguments, 0);
  console.log.apply(this, args);
  errorFunc.apply(this, args);
}

var initializer = require('./lib/voicemail-admin-init.js');

initializer.onStart(logger)
.then(function (result) {
  if (result === -1) {
    return;
  }

  var app = require ('./lib/voicemail-admin.js');
  var db = require('./database.json').db;
  var dal = require('voicemail-data')(db, {
    logger: logger
  });

  return app.create({logger: logger, dal: dal});
});
