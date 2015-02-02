/**
 * Common functions for commands.
 *
 * @module common
 *
 * @copyright 2014, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

/**
 * Returns a common API for interacting with mock repositories
 */
function createApi() {
  return {
    /**
     * Removes keys from an associative array that are either functions or objects
     *
     * @param {object} associativeArray - associative array to cull junk from
     */
    removeNonValues: function(associativeArray) {
      for (var key in associativeArray) {
        var fieldType = typeof(associativeArray[key]);
        if (fieldType === 'function' ||
            fieldType === 'object') {
          delete associativeArray[key];
        }
      }
    }
  };
}

/**
 * Returns a common API for dealing with repositories.
 */
module.exports = function() {
  return createApi();
};
