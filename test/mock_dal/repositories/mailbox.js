/**
 * Mock repository for interacting with mailbox records.
 *
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var Q = require('q');

var nextId = 1;
var mailboxes = {};

function getNextId() {
  return nextId++;
}

/**
 * Returns an API for interacting with Mailboxes
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
     * Create an instance of a mailbox.
     */
    create: function(number, context, fields, id) {
      id = common.optionalArgument(fields, id, 'number');

      var instance = {
        mailboxNumber: number,
        mailboxName: undefined,
        password: undefined,
        name: undefined,
        email: undefined,
        read: undefined,
        unread: undefined,
        greetingBusy: undefined,
        greetingAway: undefined,
        greetingName: undefined,

        getId: function() {
          return id;
        },

        getContext: function() {
          return context;
        }
      };

      return common.populateFields(instance, fields);
    },

    /**
     * Returns an array of all mailboxes belonging to the specified context
     */
    findByContext: function(context) {
      var self = this;

      return Q.fcall(function () {
        var mailboxArray = [];

        for (var index in mailboxes) {
          var mailbox = mailboxes[index];
          if (mailbox.getContext().getId() === context.getId()) {
            var fields = {mailboxName: mailbox.mailboxName,
                          password: mailbox.password,
                          name: mailbox.name,
                          email: mailbox.email,
                          read: mailbox.read,
                          unread: mailbox.unread,
                          greetingBusy: mailbox.greetingBusy,
                          greetingAway: mailbox.greetingAway,
                          greetingName: mailbox.greetingName};

            mailboxArray.push(self.create(mailbox.mailboxNumber,
                                          mailbox.getContext(),
                                          fields,
                                          mailbox.getId()));
          }
        }

        return mailboxArray;
      });
    },

    /**
     * Returns a count of all mailboxes belonging to the specified context
     */
    countByContext: function(context) {
      var count = 0;

      for (var index in mailboxes) {
        if (mailboxes[index].getContext().getId() === context.getId()) {
          count++;
        }
      }

      return count;
    },

    /**
     * Return a mailbox instance from the mock database.
     */
    get: function(number, context) {
      var self = this;

      return Q.fcall(function () {
        for (var index in mailboxes) {
          if (mailboxes[index].mailboxNumber === number &&
              mailboxes[index].getContext().getId() === context.getId()) {

            var mailbox = mailboxes[index];
            var fields = {mailboxName: mailbox.mailboxName,
                          password: mailbox.password,
                          name: mailbox.name,
                          email: mailbox.email,
                          read: mailbox.read,
                          unread: mailbox.unread,
                          greetingBusy: mailbox.greetingBusy,
                          greetingAway: mailbox.greetingAway,
                          greetingName: mailbox.greetingName};

            return self.create(mailbox.mailboxNumber,
                               mailbox.getContext(),
                               fields,
                               mailbox.getId());
          }
        }

        return null;
      });
    },

    /**
     * Save a mailbox instance to the mock database.
     */
    save: function(instance) {
      var self = this;

      return Q.fcall(function () {
        var id = instance.getId();
        var fields = {mailboxName: instance.mailboxName,
                      password: instance.password,
                      name: instance.name,
                      email: instance.email,
                      read: instance.read,
                      unread: instance.unread,
                      greetingBusy: instance.greetingBusy,
                      greetingAway: instance.greetingAway,
                      greetingName: instance.greetingName};

        if (!id) {
          id = getNextId();
        }

        mailboxes[id] = self.create(instance.mailboxNumber,
                                    instance.getContext(),
                                    fields,
                                    id);
      });
    },

    /**
     * Updates the unread count.
     *
     * @param {Mailbox} instance - mailbox instance
     * @param {Function} mwi - a function to update mwi counts that returns a
     *   promise
     * @returns {Q} promise - a promise containing the result of updating the
     *   message counts
     */
    newMessage: function(instance, mwi) {
      return updateMwi(instance, mwi, modifier);

      function modifier (row) {
        var read = +row.read || 0;
        var unread = +row.unread || 0;

        return {
          read: read,
          unread: unread + 1
        };
      }
    },

    /**
     * Deletes a mailbox instance from the mock database.
     */
    remove: function(instance) {

      return Q.fcall(function () {
        var id = instance.getId();

        if (!id) {
          throw new Error('instance has no id.');
        }

        if (!(id in mailboxes)) {
          throw new Error('instance does not exist in database.');
        }

        delete mailboxes[id];
      });
    },

    /**
     * Updates read/unread counts.
     *
     * @param {Mailbox} instance - mailbox instance
     * @param {Function} mwi - a function to update mwi counts that returns a
     *   promise
     *
     * @returns {Q} promsie - a promise containing the result of updating the
     *   message counts
     */
    readMessage: function(instance, mwi) {
      return updateMwi(instance, mwi, modifier);

      function modifier (row) {
        var read = +row.read || 0;
        // make sure unread will be 0 if currently null
        var unread = +row.unread || 1;

        return {
          read: read + 1,
          unread: unread - 1
        };
      }
    },

    /**
     * Updates the read/unread counts.
     *
     * @param {Mailbox} instance - mailbox instance
     * @param {bool} messageRead - whether deleted message had been read or not
     * @param {Function} mwi - a function to update mwi counts that returns a
     *   promise
     * @returns {Q} promise - a promise containing the result of updating the
     *   message counts
     */
    deletedMessage: function(instance, messageRead, mwi) {
      return updateMwi(instance, mwi, modifier);

      function modifier (row) {
        var read = +row.read || 0;
        // make sure unread will be 0 if currently null
        var unread = +row.unread || 0;

        if (read && messageRead) {
          read -= 1;
        }

        if (unread && !messageRead) {
          unread -= 1;
        }

        return {
          read: read,
          unread: unread
        };
      }
    },

    /**
     * Test function, resets the contents of the mailbox mock database
     */
    testReset: function(newMailboxes, newNextId) {
      if (newMailboxes !== undefined) {
        mailboxes = newMailboxes;
      } else {
        mailboxes = {};
      }

      if (newNextId !== undefined) {
        nextId = newNextId;
      } else {
        nextId = 1;
      }
    }

  };

  /**
   * Dummy function? XXX I'm really not sure what to do with this
   *
   * @param {Mailbox} instance - mailbox instance
   * @param {Function} mwi - a function to update mwi counts that returns a
   *   promise
   * @param {Function} modifier - a function that takes a database result and
   *   returns an object containing the updated read/unread counts
   * @returns {Q} promise - a promise containing the result of updating the
   *   message counts
   */
  function updateMwi(instance, mwi, modifier) {
    var mailbox = mailboxes[instance.getId()];

    return Q.fcall(function () {
    });
  }
}

module.exports = function(config, dependencies) {
  return createApi();
};
