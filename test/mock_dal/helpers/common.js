/**
 * Common (provider agnostic) functions for data access.
 *
 * @module common
 *
 * @copyright 2014, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Samuel Fortier-Galarneau <sgalarneau@digium.com>
 */

'use strict'

var Case = require('case');
var util = require('util');

/**
 * Returns a common API for interacting with mock repositories
 */
function createApi() {
  return {
    /**
     * Returns first if it matches the type, second otherwise.
     *
     * @param {object} first - optional argument
     * @param {object} second - non optional argument
     * @param {string} type - expected type of non optional argument
     */
    optionalArgument: function(first, second, type) {
      if (typeof(first) === type) {
        return first;
      } else {
        return second;
      }
    },

    /**
     * Populates the instance with fields if they contain appropriate keys.
     *
     * @param {object} instance - repository instance
     * @param {object} fields - key/value field mappings
     */
    populateFields: function(instance, fields) {
      fields = fields || {};
      Object.keys(instance).forEach(function(field) {
        if (typeof(instance[field]) !== 'function' &&
            fields[field] !== undefined) {
          instance[field] = fields[field];
        }
      });

      return instance;
    }
  };
}

/**
 * Returns a common API for dealing with repositories.
 */
module.exports = function() {
  return createApi();
};
