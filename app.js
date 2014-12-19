/**
 * Voicemail Main application bootstrap.
 *
 * @module app
 * @copyright 2014, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var initializer = require('./lib/voicemail-admin-init.js');

if (initializer.onStart()) {
  return;
}

var app = require ('./lib/voicemail-admin.js');
app.create();
