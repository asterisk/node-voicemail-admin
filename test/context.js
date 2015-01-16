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

describe('context', function () {
  var logger = {
    trace: function() {},
    debug: function() {},
    info: function() {},
    warn: function() {},
    error: function() {},
    fatal: function() {}
  };

  var adminTool = require('../lib/voicemail-admin.js');
  adminTool.testInitialize({logger: logger, dal: dal});

  beforeEach(function (done) {
    dal.context.testReset();
    done();
  });

  it('should support \'create context <domain>\'', function(done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function (result) {
      return dal.context.get('domain.com');
    }).then(function (context) {
      assert(context.domain === 'domain.com');
      assert(context.getId() === 1);
      done();
    })
    .done();
  });

  it('should support \'edit context <current_domain> <new_domain>\'',
    function (done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function (result) {
      return dal.context.get('domain.com');
    }).then(function (context) {
      assert(context.domain === 'domain.com');
      assert(context.getId() === 1);
      return adminTool.processOption(
        {command: 'edit context domain.com test.com'});
    }).then(function (result) {
      return dal.context.get('test.com');
    }).then(function (context) {
      assert(context.domain === 'test.com');
      assert(context.getId() === 1);
      done();
    })
    .done();
  });

  it('should support \'delete context <domain>\'', function (done) {
    adminTool.processOption({command: 'create context domain.com'})
    .then(function (result) {
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
