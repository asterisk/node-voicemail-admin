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
var sprintf = require('sprintf').sprintf;

describe('folder', function () {
  var infoMsgsExpected = [];
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
    error: function() {},
    fatal: function() {}
  };

  var adminTool = require('../lib/voicemail-admin.js');

  beforeEach(function (done) {
    adminTool.testInitialize({logger: logger, dal: dal});
    jsonMsgsExpected = [];
    infoMsgsExpected = [];
    done();
  });

  it('should have data for related repositories configured before starting.',
      function (done) {
    dal.folder.testReset();
    done();
  });

  it('should support \'create folder <name> <dtmf> <recording>\'',
      function (done) {
    var command = 'create folder test_folder 1 sound:test_folder';
    adminTool.processOption({command: command})
    .then(function () {
      return dal.folder.get('test_folder');
    }).then(function (folder) {
      assert(folder.name === 'test_folder');
      assert(folder.dtmf === '1');
      assert(folder.recording === 'sound:test_folder');
      assert(folder.getId() === 1);
      done();
    })
    .done();
  });

  it('should support \'show folder <name>\'',
      function (done) {

    jsonMsgsExpected.push({'name':'test_folder',
                           'dtmf':'1',
                           'recording':'sound:test_folder'});

    var command = 'show folder test_folder';
    adminTool.processOption({command: command})
    .then(function () {
      assert(jsonMsgsExpected.length === 0);
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
                  'sound:renamed_folder'});
    }).then(function () {
      return dal.folder.all();
    }).then(function (folders) {
      /* Folders should still only contain one entry */
      assert(verifyFolderCount(folders, 1));
      /* Folders should contain the folder as edited above. */
      assert(folders['1'].getId() === 1);
      assert(folders['1'].name === 'renamed_folder');
      assert(folders['1'].dtmf === '2');
      assert(folders['1'].recording === 'sound:renamed_folder');
      done();
    })
    .done();
  });

  it('should support \'show folders\'',
      function (done) {

    infoMsgsExpected.push('renamed_folder 2 sound:renamed_folder');
    infoMsgsExpected.push('test_3 3 sound:test_3');

    /* Add another folder to start with... two entries is more interesting */
    var command = 'create folder test_3 3 sound:test_3';

    adminTool.processOption({command: command})
    .then(function () {
      return adminTool.processOption({command: 'show folders'});
    })
    .then(function () {
      assert(infoMsgsExpected.length === 0);
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
