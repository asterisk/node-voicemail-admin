'use strict';

var Q = require('q');
var fs = require('fs');
var db_config_name = 'database.json';

function onStart(callback) {

  if (fs.existsSync('database.json')) {
    return 0;
  }

  var prompt = require('prompt');

  var schema = {
    properties: {
      provider: {
        required: true
      },
      connectionString: {
        required: true
      }
    }
  };

  var db_config = {};

  prompt.start();
  prompt.get(schema, function(err, result) {
    db_config.db = result;

    fs.writeFile(db_config_name, JSON.stringify(db_config), function(err) {
      if (err) {
        console.log(err);
      } else {
        console.log("%s saved.", db_config_name);
        console.log("Run 'node createtables.js' if the database is " +
                    "uninitialized.");
      }
    });
  });

  return -1;
}

/**
 * Returns module functions.
 *
 * @returns {object} module - module functions
 */
module.exports = {
  onStart: onStart
};
