/**
 *  Interface unit tests.
 *
 *  @module tests-context
 *  @copyright 2015, Digium Inc.
 *  @license Apache License, Version 2.0
 *  @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

/*global describe:false*/
/*global beforeEach:false*/
/*global it:false*/

var assert = require('assert');
var dal = require('./mock_dal/db.js')();
var sprintf = require('sprintf').sprintf;

describe('interface', function () {
  var infoMsgsExpected = [];
  var errorMsgsExpected = [];
  var jsonMsgsExpected = [];

  function evaluateJSON(args)
  {
    if (args.length < 2 || args[0] !== '\%j') {
      return;
    }

    var outputJSON = args[1];

    jsonMsgsExpected = jsonMsgsExpected.filter(function (thisExpectedJSON) {
      function keyCount(a) {
        var size = 0;
        for (var key in a) {
          size++;
        }

        return size;
      }

      if (keyCount(thisExpectedJSON) !== keyCount(outputJSON)) {
        /* Keep it in the array, key counts are different */
        return true;
      }

      for (var key in thisExpectedJSON) {
        if (thisExpectedJSON[key] !== outputJSON[key]) {
          /* keep it, an element is different */
          return true;
        }
      }

      /* It's a match, remove it from the array. */
      return false;
    });
  }

  function evaluateInfo(args)
  {
    /*jshint validthis:true */
    var output = sprintf.apply(this, args);

    /* trim extra spaces used for formatting */
    output = output.replace(/\s+/g,' ').trim();

    var index = infoMsgsExpected.indexOf(output);
    if (index > -1) {
      infoMsgsExpected.splice(index, 1);
    }
  }

  function evaluateError(args)
  {
    if (args.length < 2) {
      return;
    }

    var error = args[1];
    var index = errorMsgsExpected.indexOf(error.message);
    if (index > -1) {
      errorMsgsExpected.splice(index, 1);
    }
  }

  var logger = {
    trace: function() {},
    debug: function() {},
    info: function() {
      var args = Array.prototype.slice.call(arguments, 0);

      if (jsonMsgsExpected.length > 0) {
        evaluateJSON(args);
      }

      if (infoMsgsExpected.length > 0) {
        evaluateInfo(args);
      }
    },
    warn: function() {},
    error: function() {
      var args = Array.prototype.slice.call(arguments, 0);

      if (errorMsgsExpected.length > 0) {
        evaluateError(args);
      }
    },
    fatal: function() {}
  };

  var adminTool = require('../lib/voicemail-admin.js');

  beforeEach(function (done) {
    adminTool.testInitialize({logger: logger, dal: dal});
    jsonMsgsExpected = [];
    infoMsgsExpected = [];
    errorMsgsExpected = [];
    done();
  });

  it('should support \'exit\'', function (done) {
    adminTool.processOption({command: 'exit'})
    .then (function (result) {
      assert(result === true);
      done();
    })
    .done();
  });

  it('should exit on a commandless entry (usually caused by abort signal)',
      function (done) {
    adminTool.processOption()
    .then (function (result) {
      assert(result === true);
      done();
    })
    .done();
  });

  it('should support \'help\'', function (done) {
    infoMsgsExpected.push('help'.green + ' - Shows a list of commands or ' +
                          'detailed info about a command.');
    infoMsgsExpected.push('exit'.green + ' - Exits the administrator tool.');
    /* We could add more, but that's just more crap to maintain if the
     * the descriptions change. */

    adminTool.processOption({command: 'help'})
    .then (function () {
      assert(infoMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should support \'help help\'', function (done) {
    infoMsgsExpected.push('Usage: ' + 'help [command]'.green);
    infoMsgsExpected.push('Shows a list of commands or detailed info about ' +
                          'a command.');
    adminTool.processOption({command: 'help help'})
    .then(function () {
      assert(infoMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should support \'help <command>\'', function (done) {
    infoMsgsExpected.push('Usage: ' +
                          ('edit mailbox <mailboxNumber>@<mailboxContext> ' +
                           '<field> <value>').green);
    infoMsgsExpected.push('Modify some value of the given mailbox.');
    infoMsgsExpected.push('fields:');
    infoMsgsExpected.push('mailboxName - name associated with the mailbox');
    infoMsgsExpected.push('password - sequence of digits used as password');
    infoMsgsExpected.push('name - owner of the mailbox');
    infoMsgsExpected.push('email - email associated with the mailbox');
    adminTool.processOption({command: 'help edit mailbox'})
    .then (function () {
      assert(infoMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should fail gracefully when a the command does not exist',
      function (done) {
    errorMsgsExpected.push('Unknown command \'fake_command\'');
    adminTool.processOption({command: 'fake_command'})
    .then (function () {
      assert(errorMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should fail gracefully when a command indicates syntax is wrong',
      function (done) {
    errorMsgsExpected.push('Invalid Syntax for \'create folder\'');
    adminTool.processOption({command: 'create folder not_enough_parameters'})
    .then (function () {
      assert(errorMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should be tolerant to empty commands',
      function (done) {
    adminTool.processOption({command: ''})
    .then (function () {
      done();
    })
    .done();
  });

});

