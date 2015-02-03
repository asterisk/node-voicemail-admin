/**
 * Mock repository for interacting with folder records.
 *
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var Q = require('q');

var nextId = 1;
var folders = {};

function getNextId() {
  return nextId++;
}

/**
 * Returns an API for interacting with Folders
 */
function createApi() {
  var common = require('../helpers/common.js')();

  return {

    /**
     * Returns a promise that does nothing in particular.
     */
    createTable: function() {
      return Q.fcall(function () {
      });
    },

    /**
     * Returns a promise that does nothing in particular.
     */
    createIndexes: function() {
      return Q.fcall(function () {
      });
    },

    /**
     * Create an instance of a folder.
     */
    create: function(fields, id) {
      id = common.optionalArgument(fields, id, 'number');

      var instance = {
        name: undefined,
        recording: undefined,
        dtmf: undefined,

        getId: function() {
          return id;
        }
      };

      return common.populateFields(instance, fields);

    },

    /**
     * Returns an array of all folder instances from the mock database.
     */
    all: function() {
      var self = this;

      return Q.fcall(function () {
        var folderArray = {};

        for (var index in folders) {
          var instance = self.create({name: folders[index].name,
                                      recording: folders[index].recording,
                                      dtmf: folders[index].dtmf},
                                     folders[index].getId());
          folderArray[index] = instance;
        }

        return folderArray;
      });
    },

    /**
     * Return a folder instance from the mock database.
     */
    get: function(name) {
      var self = this;

      return Q.fcall(function () {
        for (var index in folders) {
          if (folders[index].name === name) {
            return self.create({name: folders[index].name,
                                recording: folders[index].recording,
                                dtmf: folders[index].dtmf},
                               folders[index].getId());
          }
        }

        return null;
      });
    },

    /**
     * Return an array of folder instances from the mock database matching
     * the name or DTMF provided. Useful for checking for conflicts
     * prior to adding a new item.
     */
    findByNameOrDTMF: function(name, dtmf) {
      var self = this;

      return Q.fcall(function () {
        var folderArray = [];

        for (var index in folders) {
          if (folders[index].name === name ||
              folders[index].dtmf === dtmf) {
            folderArray.push(self.create({name: folders[index].name,
                                          recording: folders[index].recording,
                                          dtmf: folders[index].dtmf},
                                         folders[index].getId()));
          }
        }

        return folderArray;
      });
    },

    /**
     * Save a folder instance to the mock database.
     */
    save: function(instance) {
      var self = this;

      return Q.fcall(function () {
        var id = instance.getId();

        if (!id) {
          id = getNextId();
        }

        folders[id] = self.create({name: instance.name,
                                    recording: instance.recording,
                                    dtmf: instance.dtmf},
                                   id);
      });
    },

    /**
     * Deletes a folder instance from the mock database.
     */
    remove: function(instance) {
      return Q.fcall(function () {
        var id = instance.getId();

        if (!id) {
          throw new Error('instance has no id.');
        }

        if (!(id in folders)) {
          throw new Error('instance does not exist in database.');
        }

        delete folders[id];
      });
    },

    /**
     * Test function, resets the contents of the folder mock database
     */
    testReset: function(newFolders, newNextId) {
      if (newFolders !== undefined) {
        folders = newFolders;
      } else {
        folders = {};
      }

      if (newNextId !== undefined) {
        nextId = newNextId;
      } else {
        nextId = 1;
      }
    }
  };
}

module.exports = function(config, dependencies) {
  return createApi();
};
