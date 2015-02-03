/**
 * Voicemail Administrator Context Commands.
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

function createCommands(dependencies) {
  dal = dependencies.dal;
  logger = dependencies.logger;

  return {
    showContexts: function(chosenCommand, entryComponents) {
      return dal.context.all()
        .then(function(contexts) {
          logger.info('domain          '.underline);
          contexts.forEach(function (context) {
            logger.info(context.domain);
          });
        });
    },

    createContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var newContextDomain = entryComponents[2];
      var newContext = dal.context.create(newContextDomain);

      return dal.context.get(newContextDomain)
        .then(function(existingContext) {
          if (existingContext) {
            throw new Error(sprintf('Context with domain \'%s\' already ' +
                                    'exists.', newContextDomain));
          }

          return dal.context.save(newContext);
        })
        .then(function() {
          logger.info('Successfully created context \'%s\''.green,
                      newContextDomain);
        });
    },

    editContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 4) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var domain = entryComponents[2];
      var newValue = entryComponents[3];

      if (newValue.length < 1) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      return dal.context.get(newValue)
        .then(function(existingContext) {
          /* Prevent creation of duplicate domains */
          if (existingContext) {
            throw new Error(sprintf('A context with domain \'%s\' already ' +
                                    'exists.', newValue));
          }

          return dal.context.get(domain);
        })
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Context \'%s\' not found.', domain));
          }

          context.domain = newValue;
          return dal.context.save(context);
        })
        .then(function() {
          logger.info('Context \'%s\' changed to \'%s\''.green,
                      domain, newValue);
        });
    },

    deleteContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var domain = entryComponents[2];
      var activeContext;

      return dal.context.get(domain)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf('Context \'%s\' not found.',
                                    domain));
          }

          activeContext = context;

          return dal.mailbox.countByContext(activeContext);
        })
        .then(function(count) {
          if (count) {
            throw new Error(sprintf('Context \'%s\' contains %s mailbox(es) ' +
                                    'that must be deleted first.',
                                    domain, count));
          }

          return dal.context.remove(activeContext);
        })
        .then(function() {
          logger.info(sprintf('Deleted context \'%s\''.green,
                              domain));
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
