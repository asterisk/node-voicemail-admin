/**
 *  Folder specific unit tests.
 *
 *  @module tests-folder
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

describe('folder', function () {
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
    done();
  });

  it('should have data for related repositories configured before starting.',
      function (done) {
    dal.folder.testReset();
    done();
  });

  it('should support \'create folder <name> <dtmf> <recording>\'',
      function (done) {
    var command = 'create folder test_folder 1 test_folder_recording';
    adminTool.processOption({command: command})
    .then(function () {
      return dal.folder.get('test_folder');
    }).then(function (folder) {
      assert(folder.name === 'test_folder');
      assert(folder.dtmf === '1');
      assert(folder.recording === 'test_folder_recording');
      assert(folder.getId() === 1);
      done();
    })
    .done();
  });

  it('should support \'edit folder <name> <field> <value>\'',
      function (done) {
    var verifyFolderCount = function (folders, count) {
      var total = 0;
      for (var index in folders) {
        total++;
      }

      return (total === count);
    };

    var command = 'edit folder test_folder name renamed_folder';
    adminTool.processOption({command: command})
    .then(function () {
      return adminTool.processOption(
        {command: 'edit folder renamed_folder dtmf 2'});
    }).then(function () {
      return adminTool.processOption(
        {command: 'edit folder renamed_folder recording ' +
                  'renamed_folder_recording'});
    }).then(function () {
      return dal.folder.all();
    }).then(function (folders) {
      /* Folders should still only contain one entry */
      assert(verifyFolderCount(folders, 1));
      /* Folders should contain the folder as edited above. */
      assert(folders['1'].getId() === 1);
      assert(folders['1'].name === 'renamed_folder');
      assert(folders['1'].dtmf === '2');
      assert(folders['1'].recording === 'renamed_folder_recording');
      done();
    })
    .done();
  });

  it('should support \'delete folder <name>\'',
      function (done) {
    var command = 'delete folder renamed_folder';
    adminTool.processOption({command: command})
    .then(function () {
      return dal.folder.get('renamed_folder');
    }).then(function (folder) {
      assert(folder === null);
      done();
    })
    .done();
  });

});
