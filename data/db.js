'use strict';

function createTables(config) {
  var util = require('util');

  console.log(config);

  var providerName = config.connectionString.split(':')[0];
  var Provider = require(util.format('./providers/%s/concrete.js', providerName));
  var data = new Provider(config);

  data.init();
}

/**
 * Returns module functions.
 *
 * @returns {object} module - module functions
 */
module.exports = {
  createTables: createTables
};
