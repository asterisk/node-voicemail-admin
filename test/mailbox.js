/**
 *  Mailbox specific unit tests.
 *
 *  @module tests-folder
 *  @copyright 2015, Digium Inc.
 *  @license Apache License, Version 2.0
 *  @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

/*global describe:false */
/*global beforeEach:false */
/*global it:false*/

var assert = require('assert');
var dal = require('./mock_dal/db.js')();

describe('mailbox', function() {
  var logger = {
    trace: function() {},
    debug: function() {},
    info: function() {},
    warn: function() {},
    error: function() {},
    fatal: function() {}
  };

  var adminTool = require('../lib/voicemail-admin.js');

  beforeEach(function (done) {
    done();
  });

  it('should have data for related repositories configured before starting.',
      function (done) {
    dal.context.testReset();
    dal.mailbox.testReset();
    dal.folder.testReset();
    dal.message.testReset();
    adminTool.processOption({command: 'create context domain.com'})
    .then(function () {
      done();
    })
    .done();
  });

  it('should support \'create mailbox <box_number>@<box_context> ' +
      '<password> <name> <email>', function (done) {
    var command = 'create mailbox 1000@domain.com 1111 "Test Mailbox" ' +
                  'test@digium.com';
    adminTool.processOption({command: command})
    .then(function () {
      return dal.context.get('domain.com');
    })
    .then(function (context) {
      return dal.mailbox.get('1000', context);
    })
    .then(function (mailbox) {
      assert(mailbox.getId() === 1);
      assert(mailbox.getContext().getId() === 1);
      assert(mailbox.password === '1111');
      assert(mailbox.name === 'Test Mailbox');
      assert(mailbox.email === 'test@digium.com');
      done();
    })
    .done();
  });

  it('should support \'edit mailbox <box_number>@<box_context> ' +
      '<field> <value>', function (done) {
    var command = 'edit mailbox 1000@domain.com mailboxName "Edited Mailbox"';
    adminTool.processOption({command: command})
    .then(function () {
      return adminTool.processOption(
        {command: 'edit mailbox 1000@domain.com password 2222'});
    })
    .then(function () {
      return adminTool.processOption(
        {command: 'edit mailbox 1000@domain.com name "Dan Dannings"'});
    })
    .then(function () {
      return adminTool.processOption(
        {command: 'edit mailbox 1000@domain.com email ddannings@digium.com'});
    })
    .then(function () {
      return dal.context.get('domain.com');
    })
    .then(function (context) {
      return dal.mailbox.get('1000', context);
    })
    .then(function (mailbox) {
      assert(mailbox.getId() === 1);
      assert(mailbox.getContext().getId() === 1);
      assert(mailbox.mailboxNumber === '1000');
      assert(mailbox.mailboxName === 'Edited Mailbox');
      assert(mailbox.password === '2222');
      assert(mailbox.name === 'Dan Dannings');
      assert(mailbox.email === 'ddannings@digium.com');
      done();
    })
    .done();
  });

  it('should support \'delete mailbox <box_number>@<box_context>',
      function (done) {
    var command = 'delete mailbox 1000@domain.com';
    adminTool.processOption({command: command})
    .then(function () {
      return dal.context.get('domain.com');
    })
    .then(function (context) {
      return dal.mailbox.get('1000', context);
    })
    .then(function (mailbox) {
      assert(mailbox === null);
      done();
    })
    .done();
  });

  it('should fail to delete a mailbox that has messages and it should ' +
     'support \'delete messages <mailboxNumber>@<mailboxContext>\'.',
      function(done) {
    var folderFields = {
      name: 'folder1',
      recording: 'sound:folder1',
      dtmf: '1'
    };
    var holdContext;
    var holdMailbox;

    dal.folder.save(dal.folder.create(folderFields))
    .then(function () {
      return dal.context.get('domain.com');
    })
    .then(function (context) {
      holdContext = context;
      var mailbox = dal.mailbox.create('1000', context, {});
      return dal.mailbox.save(mailbox);
    })
    .then(function () {
      return dal.mailbox.get('1000', holdContext);
    })
    .then(function (mailbox) {
      holdMailbox = mailbox;
      return dal.folder.get('folder1');
    })
    .then(function (folder) {
      var message = dal.message.create(holdMailbox, folder, {});
      message.init();
      return dal.message.save(message);
      /* Ok, after that long chain of crap, we should have a mailbox
         with a message in it. */
    })
    .then(function () {
      var command = 'delete mailbox 1000@domain.com';
      return adminTool.processOption({command: command});
    })
    .then(function () {
      return dal.mailbox.get('1000', holdContext);
    })
    .then(function (mailbox) {
      /* Confirm deletion failed due to the presence of the message */
      assert(mailbox);

      return adminTool.processOption(
          {command: 'delete messages 1000@domain.com'})
      .then (function () {
        return mailbox;
      });
    })
    .then(function (mailbox) {
      /* Ok, now confirm the last command deleted any messages */
      assert(dal.message.countByMailbox(mailbox) === 0);
      done();
    })
    .done();
  });
});
