/**
 * Mock repository for interacting with context records.
 *
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var Q = require('q');

var nextId = 1;
var contexts = {};

function getNextId() {
  return nextId++;
}

/**
 * Returns an API for interacting with Contexts
 */
function createApi() {
  return {

    /**
     * Returns a promise that does nothing in particular.
     */
    createTable: function() {
      return Q.fcall(function () {
      });
    },

    /**
     * Returns a promsie that does nothing in particular.
     */
    createIndexes: function() {
      return Q.fcall(function () {
      });
    },

    /**
     * Create an instance of a context.
     */
    create: function(domain, id) {

      return {
        domain: domain,

        getId: function() {
          return id;
        }
      };
    },

    /**
     * Returns an array of all context instances from the mock database.
     */
    all: function() {
      var self = this;

      return Q.fcall(function () {
        var contextArray = [];

        for (var index in contexts) {
          var instance = self.create(contexts[index].domain,
                                     contexts[index].getId());
          contextArray.push(instance);
        }

        return contextArray;
      });
    },

    /**
     * Return a context instance from the mock database.
     */
    get: function(domain) {
      var self = this;

      return Q.fcall(function () {
        for (var index in contexts) {
          if (contexts[index].domain === domain) {
            return self.create(contexts[index].domain,
                               contexts[index].getId());
          }
        }

        return null;
      });
    },

    /**
     * Save a context instance to the mock database.
     */
    save: function(instance) {
      var self = this;

      return Q.fcall(function () {
        var id = instance.getId();

        if (!id) {
          id = getNextId();
        }

        contexts[id] = self.create(instance.domain, id);
      });
    },

    /**
     * Deletes a context instance from the mock database.
     */
    remove: function(instance) {

      return Q.fcall(function () {
        var id = instance.getId();

        if (!id) {
          throw new Error('instance has no id.');
        }

        if (!(id in contexts)) {
          throw new Error('instance does not exist in database.');
        }

        delete contexts[id];
      });
    },

    /**
     * Test function, resets the contents of the context mock database
     */
    testReset: function(newContexts, newNextId) {
      if (newContexts !== undefined) {
        contexts = newContexts;
      } else {
        contexts = {};
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
