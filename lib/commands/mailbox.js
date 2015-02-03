/**
 * Voicemail Administrator Mailbox Commands.
 *
 * @module voicemail-admin
 * @copyright 2015, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan R. Rose <jrose@digium.com>
 */

'use strict';

var dal;
var logger;
var sprintf = require('sprintf').sprintf;
var common = require('./helpers/common.js')();

function createCommands(dependencies) {
  dal = dependencies.dal;
  logger = dependencies.logger;

  return {
    showMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxNumber = mailboxKey[0];
      var mailboxContext = mailboxKey[1];

      return dal.context.get(mailboxContext)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Mailbox \'%s@%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          return dal.mailbox.get(mailboxNumber, context);
        })
        .then(function(mailbox) {
          if (!mailbox) {
            throw new Error(sprintf('Mailbox \'%s@%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          common.removeNonValues(mailbox);
          logger.info('%j', mailbox);
        });
    },

    showMailboxes: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var domain = entryComponents[2];

      return dal.context.get(domain)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Context \'%s\' not found.', domain));
          }

          return dal.mailbox.findByContext(context);
        })
        .then(function(mailboxes) {
          logger.info(sprintf('%-20s %-25s %-25s',
                              'number',
                              'email',
                              'name').underline);

          mailboxes.forEach(function (mailbox) {
            logger.info(sprintf('%-20s %-25s %-25s',
              mailbox.mailboxNumber + '@' + domain,
              mailbox.email,
              mailbox.name));
          });
        });
    },

    createMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 6) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxNumber = mailboxKey[0];
      var mailboxContext = mailboxKey[1];
      var password = entryComponents[3];
      var name = entryComponents[4];
      var email = entryComponents[5];
      var holdContext;

      return dal.context.get(mailboxContext)
        .then(function(context) {
          holdContext = context;

          if (!context) {
            throw new Error(sprintf('Context \'%s\' requested for \'%s@%s\' ' +
                                    'does not exist.', mailboxContext,
                                    mailboxNumber, mailboxContext));
          }

          return dal.mailbox.get(mailboxNumber, context);
        })
        .then(function(existingMailbox) {
          if (existingMailbox) {
            throw new Error(sprintf('Requested mailbox \'%s@%s\' already ' +
                                    'exists.', mailboxNumber,
                                    mailboxContext));
          }

          var fields = {'password': password, 'name': name, 'email': email};
          var mailbox = dal.mailbox.create(mailboxNumber, holdContext, fields);
          return dal.mailbox.save(mailbox);
        })
        .then(function() {
          logger.info('Successfully created mailbox \'%s@%s\'.'.green,
                      mailboxNumber, mailboxContext);
        });
    },

    editMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxNumber = mailboxKey[0];
      var mailboxContext = mailboxKey[1];
      var field = entryComponents[3];
      var newValue = entryComponents[4];

      return dal.context.get(mailboxContext)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Mailbox \'%s@%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          return dal.mailbox.get(mailboxNumber, context);
        })
        .then(function(mailbox) {
          if (!mailbox) {
            throw new Error(sprintf('Mailbox \'%s@%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          if (field === 'mailboxName') {
            mailbox.mailboxName = newValue;
          } else if (field === 'password') {
            mailbox.password = newValue;
          } else if (field === 'name') {
            mailbox.name = newValue;
          } else if (field === 'email') {
            mailbox.email = newValue;
          } else {
            throw new Error(sprintf('\'%s\' is not an editable property of ' +
                                    'mailboxes.', field));
          }

          return dal.mailbox.save(mailbox);
        })
        .then(function() {
          logger.info('Mailbox \'%s%s\' updated'.green,
                      mailboxNumber, mailboxContext);
        });
    },

    deleteMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxNumber = mailboxKey[0];
      var mailboxContext = mailboxKey[1];
      var messageCount;
      var activeMailbox;

      return dal.context.get(mailboxContext)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Mailbox \'%s%s\' not found.',
                            mailboxNumber, mailboxContext));
          }

          return dal.mailbox.get(mailboxNumber, context);
        })
        .then(function(mailbox) {
          activeMailbox = mailbox;

          if (!activeMailbox) {
            throw new Error(sprintf('Mailbox \'%s%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          return dal.message.countByMailbox(activeMailbox);
        })
        .then(function(count) {
          if (count) {
            throw new Error(sprintf('Mailbox \'%s@%s\' has %s messages in ' +
                                    'it that must be deleted first.',
                                    mailboxNumber, mailboxContext, count));
          }

          return dal.mailbox.remove(activeMailbox);
        })
        .then(function() {
          logger.info(sprintf('Deleted mailbox \'%s@%s\''.green,
                              mailboxNumber, mailboxContext));
        });
    },

    deleteMessages: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var mailboxNumber = mailboxKey[0];
      var mailboxContext = mailboxKey[1];
      var messageCount;
      var activeMailbox;

      return dal.context.get(mailboxContext)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Mailbox \'%s@%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          return dal.mailbox.get(mailboxNumber, context);
        })
        .then(function(mailbox) {
          activeMailbox = mailbox;

          if (!activeMailbox) {
            throw new Error(sprintf('Mailbox \'%s@%s\' not found.',
                                    mailboxNumber, mailboxContext));
          }

          return dal.message.countByMailbox(activeMailbox);
        })
        .then(function(count) {
          messageCount = count;

          if (!messageCount) {
            return;
          }

          return dal.message.removeByMailbox(activeMailbox);
        })
        .then(function() {
          logger.info(sprintf('Deleted %s messages'.green,
                              messageCount));
        });
    }

  };
}

/**
 * Returns module functions
 *
 * @returns {object} module - moduel functions
 */
module.exports = {
  createCommands: createCommands
};
