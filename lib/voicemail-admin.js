/**
 * Voicemail Administrator application.
 *
 * @module voicemail-admin
 * @copyright 2014, Digium, Inc.
 * @license Apache License, Version 2.0
 * @author Jonathan R. Rose <jrose@digium.com>
 */

'use strict';

var menu = require('../menu.json');
var prompt = require('prompt');

var dal;
var logger;

var sprintf = require('sprintf').sprintf;

var commands = createApi();

var Q = require('q');

prompt.message = '';
prompt.delimiter = '';
var inputIndicator = {
  name: 'command',
  message: '=>'.green
};

var internalCommands = ['exit', 'help'];

/**
 * Returns a promise that resolves when the requested command is finished
 * executing.
 *
 * @param {object} result - command entered by prompt.get()
 */
function processOption(result) {
  var entryComponents;
  var baseCommand;
  var chosenCommand = false;
  var functionPtr;
  var index;

  return Q.fcall(function () {
    if (!result || !result.command) {
      return exit();
    }

    /* Split the string by spaces, but keep stuff between quotes together */
    entryComponents = result.command.match(/(?:[^\s"]+|"[^"]*")+/g);

    if (!entryComponents) {
      return;
    }

    entryComponents = entryComponents.map(function(component) {
      return component.replace(/"/g, '');
    });

    /* help is the only single word command -- everything else is two words */
    if (entryComponents.length === 1 ||
        internalCommands.indexOf(entryComponents[0]) > -1) {
      baseCommand = entryComponents[0];
    } else {
      baseCommand = entryComponents[0] + ' ' + entryComponents[1];
    }

    chosenCommand = menu.commands[baseCommand];

    if (!chosenCommand) {
      throw new Error(sprintf('Unknown command \'%s\'', result.command));
    }

    functionPtr = commands[chosenCommand.action];

    return functionPtr(chosenCommand, entryComponents);
  })
  .catch(function (error) {
    logger.error('%s', error);
  });
}

var getPrompt = Q.denodeify(prompt.get);

/**
 * Prints detailed help information for a single command to the terminal
 *
 * @param {array} entryComponents - all parts of the command as it was entered
 */
function showHelpCommand(entryComponents) {
  var commandName;
  var chosenCommand = false;

  /* entry components must be array of 2 or greater */
  if (entryComponents.length === 2) {
    commandName = entryComponents[1];
  } else {
    commandName = entryComponents[1] + ' ' + entryComponents[2];
  }

  chosenCommand = menu.commands[commandName];

  if (!chosenCommand) {
    throw new Error('Command: \'%s\' does not exist.');
  }

  logger.info('Usage: ' + chosenCommand.usage.green);
  logger.info(chosenCommand.description);

  chosenCommand.details.forEach(function (detail) {
    logger.info(detail);
  });
}

/**
 * Removes keys from an associative array that are either functions or objects
 *
 * @param {object} associativeArray - associative array to cull junk from
 */
function removeUgly(associativeArray) {
  for (var key in associativeArray) {
    var fieldType = typeof(associativeArray[key]);
    if (fieldType === 'function' ||
        fieldType === 'object') {
      delete associativeArray[key];
    }
  }
}

/**
 * Throws an invalid syntax error
 *
 * @param {array} entryComponents - full command as it was entered
 */
function invalidSyntax(entryComponents) {
  throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
    entryComponents[0], entryComponents[1]));
}

/**
 * Returns true, prints a cute little exit message
 */
function exit() {
  logger.info('So long and thanks for all the fish'.cyan);
  return true;
}

/**
 * Returns full suite of commands needed to defined in menu.json
 *
 * All commands have arguments of chosenCommand and entryComponents
 * chosenCommand is the associative array that defines details about
 * the command currently in execution. entryComponents is an array
 * containing the user-inputted elements of the command on a word
 * by word basis (though words can be joined into a single element by
 * putting them between quotation marks).
 */
function createApi() {
  return {
    showHelp: function(chosenCommand, entryComponents) {
      if (entryComponents.length >= 2) {
        return showHelpCommand(entryComponents);
      }

      logger.info(sprintf('%-70s'.underline, 'Command List:'));
      for (var key in menu.commands) {
        var command = menu.commands[key];
        logger.info(sprintf('%s'.green + ' - %s',
                            key, command.description));
      }
    },

    exit: function(chosenCommand, entryComponents) {
      return exit();
    },

    showContexts: function(chosenCommand, entryComponents) {
      return dal.context.all()
        .then(function(contexts) {
          logger.info('domain          '.underline);
          contexts.forEach(function (context) {
            logger.info(context.domain);
          });
        });
    },

    showFolders: function(chosenCommand, entryComponents) {
      return dal.folder.all()
        .then(function(folders) {

          logger.info(sprintf('%-12s %-6s %-30s'.underline,
                              'name', 'dtmf', 'recording'));
          for (var key in folders) {
            var folder = folders[key];

            if (key === 'add') {
              /* This is not a folder. */
              continue;
            }

            logger.info(sprintf('%-12s %-6s %s',
              folder.name, folder.dtmf, folder.recording));
          }
        });
    },

    showFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
      }

      var folderName = entryComponents[2];

      return dal.folder.get(folderName)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf('Folder \'%s\' not found.', folderName));
          }

          removeUgly(folder);
          logger.info('%j', folder);
        });
    },

    showMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return invalidSyntax(entryComponents);
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

          removeUgly(mailbox);
          logger.info('%j', mailbox);
        });
    },

    showMailboxes: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
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

    createContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
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

    createMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 6) {
        return invalidSyntax(entryComponents);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return invalidSyntax(entryComponents);
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

          var mailbox = dal.mailbox.create(mailboxNumber, holdContext);
          mailbox.password = password;
          mailbox.name = name;
          mailbox.email = email;

          return dal.mailbox.save(mailbox);
        })
        .then(function() {
          logger.info('Successfully created mailbox \'%s@%s\'.'.green,
                      mailboxNumber, mailboxContext);
        });
    },

    createFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        return invalidSyntax(entryComponents);
      }

      var newFolderName = entryComponents[2];
      var newFolderDTMF = entryComponents[3];
      var newFolderRecording = entryComponents[4];

      return dal.folder.findByNameOrDTMF(newFolderName, newFolderDTMF)
        .then(function(existingFolders) {
          if (existingFolders && existingFolders.length > 0) {
            var conflicts = '';

            existingFolders.forEach(function (folder) {
              conflicts = conflicts.concat(sprintf('%s%s (dtmf: %s)',
                          conflicts.length > 0 ? ', ' : '',
                          folder.name, folder.dtmf));
            });

            throw new Error(sprintf('Requested folder conflicts with ' +
                                    'existing folders: %s', conflicts));
          }

          var newFolder = dal.folder.create({'name': newFolderName,
                               'dtmf': newFolderDTMF,
                               'recording': newFolderRecording});

          return dal.folder.save(newFolder);
        })
        .then(function() {
          logger.info('Successfully created folder \'%s\''.green,
                      newFolderName);
        });
    },

    editContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 4) {
        return invalidSyntax(entryComponents);
      }

      var domain = entryComponents[2];
      var newValue = entryComponents[3];

      if (newValue.length < 1) {
        return invalidSyntax(entryComponents);
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

    editMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        return invalidSyntax(entryComponents);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return invalidSyntax(entryComponents);
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

    editFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        return invalidSyntax(entryComponents);
      }

      var folderName = entryComponents[2];
      var field = entryComponents[3];
      var newValue = entryComponents[4];

      if (newValue.length < 1) {
        return invalidSyntax(entryComponents);
      }

      /* name changes have to be handled via a separate mechanism from other
       * fields since pre-existing folders might cause conflicts */
      if (field === 'name') {
        return dal.folder.get(newValue)
          .then(function(existingFolder) {
            if (existingFolder) {
              throw new Error(sprintf('A folder named \'%s\' already exists.',
                                      newValue));
            }

            return dal.folder.get(folderName);
          })
          .then(function(folder) {
            if (!folder) {
              throw new Error(sprintf('Folder \'%s\' not found.', folderName));
            }

            folder.name = newValue;
            return dal.folder.save(folder);
          })
          .then(function() {
            logger.info('Folder \'%s\' changed to \'%s\''.green,
                        folderName, newValue);
          });
      }

      return dal.folder.get(folderName)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf('Folder \'%s\' not found.', folderName));
          }

          if (field === 'dtmf') {
            folder.dtmf = newValue;
          } else if (field === 'recording') {
            folder.recording = newValue;
          } else {
            throw new Error(sprintf('\'%s\' is not an editable property of ' +
                                    'folders.', field));
          }

          return dal.folder.save(folder);
        })
        .then(function(result) {
          logger.info('Folder \'%s\' updated'.green, folderName);
        });
    },

    deleteMessages: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return invalidSyntax(entryComponents);
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
    },

    deleteMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return invalidSyntax(entryComponents);
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

    deleteFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
      }

      var folderName = entryComponents[2];
      var activeFolder;

      return dal.folder.get(folderName)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf('Folder \'%s\' not found.',
                                    folderName));
          }

          activeFolder = folder;
          return dal.message.countByFolder(activeFolder);
        })
        .then(function(count) {
          if (count) {
            throw new Error(sprintf('Folder \'%s\' has %s messages in it ' +
                                    'that must be deleted first.',
                                    folderName, count));
          }

          return dal.folder.remove(activeFolder);
        })
        .then(function() {
          logger.info(sprintf('Deleted folder \'%s\''.green,
                              folderName));
        });
    },

    deleteContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return invalidSyntax(entryComponents);
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
 * Perpetuates a chain of requesting input and executing commands
 * based on that input until an exit command is called.
 *
 * @param {object} input results of prompt.get()
 */
function processOptionPrompt(input)
{
  return processOption(input)
  .then(function (result) {
    if (result !== true) {
      return getPrompt(inputIndicator);
    }

    return null;
  })
  .then(function (input) {
    if (input !== null) {
      return processOptionPrompt(input);
    }
  });
}

/**
 * Gets the application running
 *
 * @dependencies {object} - contains a data access layer
 * and a logger for use with the application.
 */
function create(dependencies) {
  dal = dependencies.dal;
  logger = dependencies.logger;

  prompt.start();
  return getPrompt(inputIndicator)
  .then(function (result) {
    processOptionPrompt(result);
  });
}

/**
 * Test specific function that resets the data access
 * layer and logger as needed.
 *
 * @dependencies {object} - contains a data access layer
 * and a logger for use with the application.
 */
function testInitialize(dependencies) {
  dal = dependencies.dal;
  logger = dependencies.logger;
}

/**
 * Returns module functions.
 *
 * @returns {object} module - module functions
 */
module.exports = {
  create: create,
  testInitialize: testInitialize,
  processOption: processOption
};
