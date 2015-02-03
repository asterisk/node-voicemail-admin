/**
 *  Context specific unit tests.
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

describe('context', function () {
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
    dal.context.testReset();
    done();
  });

  it('should support \'create context <domain>\'', function(done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function () {
      return dal.context.get('domain.com');
    }).then(function (context) {
      assert(context.domain === 'domain.com');
      assert(context.getId() === 1);
      done();
    })
    .done();
  });

  it('should fail when trying to create duplicates of the same domain.',
      function (done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function () {
      errorMsgsExpected.push('Context with domain \'domain.com\' already ' +
                             'exists.');
      return adminTool.processOption({command: 'create context domain.com'});
    })
    .then(function () {
      assert(errorMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should support \'edit context <current_domain> <new_domain>\'',
      function (done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function () {
      return dal.context.get('domain.com');
    }).then(function (context) {
      assert(context.domain === 'domain.com');
      assert(context.getId() === 1);
      return adminTool.processOption(
        {command: 'edit context domain.com test.com'});
    }).then(function () {
      return dal.context.get('test.com');
    }).then(function (context) {
      assert(context.domain === 'test.com');
      assert(context.getId() === 1);
      done();
    })
    .done();
  });

  it('should support \'show contexts\'',
      function (done) {

    infoMsgsExpected.push('domain.com');
    infoMsgsExpected.push('test.net');

    /* Add the contexts first. */
    adminTool.processOption({command: 'create context domain.com'})
    .then(function () {
      return adminTool.processOption({command: 'create context test.net'});
    })
    .then(function () {
      return adminTool.processOption({command: 'show contexts'});
    })
    .then(function () {
      /* It should be cleared out by the specialized logger function */
      assert(infoMsgsExpected.length === 0);
      done();
    })
    .done();
  });

  it('should support \'delete context <domain>\'', function (done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function () {
      return dal.context.get('domain.com');
    }).then(function (context) {
      /* Make sure the entry was added in the first place */
      assert(context.domain === 'domain.com');
      assert(context.getId() === 1);
      return adminTool.processOption(
        {command: 'delete context domain.com'});
    }).then(function () {
      return dal.context.get('domain.com');
    }).then(function (result) {
      /* Make sure the entry has been deleted */
      assert(result === null);
      done();
    })
    .done();
  });
});
