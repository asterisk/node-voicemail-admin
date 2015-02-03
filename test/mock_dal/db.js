/**
 * Mock Data Access Layer module for Asterisk Voicemail.
 *
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var contextRepo = require('./repositories/context.js');
var folderRepo = require('./repositories/folder.js');
var mailboxRepo = require('./repositories/mailbox.js');
var messageRepo = require('./repositories/message.js');

module.exports = function() {
  var repos = {
    context: contextRepo(),
    folder: folderRepo(),
    mailbox: mailboxRepo(),
    message: messageRepo()
  };

  return repos;
};
