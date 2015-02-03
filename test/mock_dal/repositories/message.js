/**
 * Mock repository for interacting with message records.
 *
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan Rose <jrose@digium.com>
 */

'use strict';

var Q = require('q');
var moment = require('moment');

var nextId = 1;
var messages = {};

function getNextId() {
  return nextId++;
}

/**
 * Returns an API for interacting with Messages
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
     * Create an instance of a message.
     */
    create: function(mailbox, folder, fields, id) {
      id = common.optionalArgument(fields, id, 'number');

      var instance = {
        date: undefined,
        read: undefined,
        originalMailbox: undefined,
        callerId: undefined,
        duration: undefined,
        recording: undefined,

        getId: function() {
          return id;
        },

        getMailbox: function() {
          return mailbox;
        },

        getFolder: function() {
          return folder;
        },

        /**
         *
         */
        init: function() {
          this.date = moment.utc();
          this.read = false;
        },

        markAsRead: function() {
          if (!this.read) {
            this.read = true;
            return true;
          }

          return false;
        }
      };

      return common.populateFields(instance, fields);
    },

    /**
     * Return a message instance from the mock database.
     *
     * Note: private fields remain unchanged from the given instance.
     */
    get: function(instance) {
      var self = this;

      return Q.fcall(function () {
        var message = messages[instance.getId()];
        var fields = {
          date: message.date,
          read: message.read,
          originalMailbox: message.originalMailbox,
          callerId: message.callerId,
          duration: message.duration,
          recording: message.recording
        };

        return self.create(message.getMailbox(),
                           message.getFolder(),
                           fields,
                           message.getId());
      });
    },

    /**
     * Returns a count of all messages for the given mailbox.
     */
    countByMailbox: function(mailbox) {
      var count = 0;
      for (var index in messages) {
        if (messages[index].getMailbox().getId() === mailbox.getId()) {
          count++;
        }
      }

      return count;
    },

    /**
     * Return a count of all messages for the given folder.
     */
    countByFolder: function(folder) {
      var count = 0;
      for (var index in messages) {
        if (messages[index].getFolder().getId() === folder.getId()) {
          count++;
        }
      }

      return count;
    },

    /**
     * Returns a Messages object containing all messages for the given mailbox
     * and folder
     */
    all: function(mailbox, folder) {
      var self = this;

      return Q.fcall(function () {
        var messageArray = [];

        for (var index in messages) {
          var message = messages[index];

          if (message.getFolder().getId() === folder.getId() &&
              message.getMailbox().getId() === mailbox.getId()) {

            var fields = {
              date: message.date,
              read: message.read,
              originalMailbox: message.originalMailbox,
              callerId: message.callerId,
              duration: message.duration,
              recording: message.recording
            };

            messageArray.push(self.create(message.getMailbox(),
                                          message.getFolder(),
                                          fields,
                                          message.getId()));
          }
        }

        return messageArray;
      });
    },

    /**
     * Returns the latest messages after a given message for the given mailbox
     * and folder.
     *
     * @param {Mailbox} mailbox - mailbox instance
     * @param {Folder} folder - folder instance
     * @param {Moment} latestMessage - date of latest message
     */
    latest: function(mailbox, folder, latestMessage) {
      var self = this;

      return Q.fcall(function() {
        var messageArray = [];

        for (var index in messages) {
          var message = messages[index];
          var messageDate = moment.utc(message.date);

          if (message.getFolder().getId() === folder.getId() &&
              message.getMailbox().getId() === mailbox.getId() &&
              messageDate > latestMessage) {

            var fields = {
              date: message.date,
              read: message.read,
              originalMailbox: message.originalMailbox,
              callerId: message.callerId,
              duration: message.duration,
              recording: message.recording
            };

            messageArray.push(self.create(message.getMailbox(),
                                          message.getFolder(),
                                          fields,
                                          message.getId()));
          }
        }

        return messageArray;
      });
    },

    /**
     * Save a message instance to the mock database.
     */
    save: function(instance) {
      var self = this;

      return Q.fcall(function () {
        var id = instance.getId();
        var fields = {
          date: instance.date,
          read: instance.read,
          originalMailbox: instance.originalMailbox,
          callerId: instance.callerId,
          duration: instance.duration,
          recording: instance.recording,
        };

        if (!id) {
          id = getNextId();
        }

        messages[id] = self.create(instance.getMailbox(),
                                  instance.getFolder(),
                                  fields,
                                  id);
      });
    },

    /**
     * Change the folder the message belongs to.
     */
    changeFolder: function(message, folder) {
      var self = this;

      return Q.fcall(function () {
        var fields = {
            date: message.date,
            read: message.read,
            originalMailbox: message.originalMailbox,
            callerId: message.callerId,
            duration: message.duration,
            recording: message.recording
        };

        if (!message.getId()) {
          throw new Error('message has no id.');
        }

        var instance = self.create(message.getMailbox(),
                                          folder,
                                          fields,
                                          message.getId());

        return self.save(instance)
          .then(function() {
            return instance;
          });
      });
    },

    /**
     * Marks the message instance as read in the mock database.
     */
    markAsRead: function(instance) {
      var self = this;

      return Q.fcall(function () {
        if (!instance.getId()) {
          throw new Error('message has no id.');
        }

        if (instance.read) {
          return false;
        }

        instance.read = true;
        return self.save(instance)
          .then(function() {
            return true;
          });
      });
    },

    /**
     * Deletes a messages instance from the mock database.
     */
    remove: function(instance) {
      return Q.fcall(function () {
        var id = instance.getId();

        if (!id) {
          throw new Error('instance has no id.');
        }

        if (!(id in messages)) {
          throw new Error('instance does not exist in database.');
        }

        delete messages[id];
      });
    },

    /**
     * Deletes all of the messages belonging to the specific mailbox.
     */
    removeByMailbox: function(mailbox) {
      var self = this;

      return Q.fcall(function () {
        var messagesArray = [];

        for (var index in messages) {
          var message = messages[index];
          if (message.getMailbox().getId() === mailbox.getId()) {
            var fields = {
              date: message.date,
              read: message.read,
              originalMailbox: message.originalMailbox,
              callerId: message.callerId,
              duration: message.duration,
              recording: message.recording
            };
            var copy = self.create(messages[index].getMailbox(),
                                   messages[index].getFolder(),
                                   fields,
                                   messages[index].getId());

            messagesArray.push(copy);
            delete messages[index];
          }
        }

        return messagesArray;
      });
    },

    /**
     * Test function, resets the contents of the message mock database
     */
    testReset: function(newMessages, newNextId) {
      if (newMessages !== undefined) {
        messages = newMessages;
      } else {
        messages = {};
      }

      if (newNextId !== undefined) {
        nextId = newNextId;
      } else {
        nextId = 1;
      }
    }  };
}

module.exports = function(config, dependencies) {
  return createApi();
};
