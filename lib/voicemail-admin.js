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

function processOption(result) {
  var entryComponents;
  var baseCommand;
  var chosenCommand = false;
  var functionPtr;
  var index;

  if (!result) {
    return Q.fcall(exit);
  }

  /* Split the string by spaces, but keep stuff between quotes together */
  entryComponents = result.command.match(/(?:[^\s"]+|"[^"]*")+/g);
  entryComponents = entryComponents.map(function(component) {
    return component.replace(/"/g, '');
  });

  if (!entryComponents) {
    return Q.fcall(function () {
      /* do nothing */
    });
  }

  /* help is the only single word command -- everything else is two words */
  if (entryComponents.length === 1 ||
      internalCommands.indexOf(entryComponents[0]) > -1) {
    baseCommand = entryComponents[0];
  } else {
    baseCommand = entryComponents[0] + ' ' + entryComponents[1];
  }

  for (index in menu.commands) {
    if (baseCommand === menu.commands[index].command) {
      chosenCommand = menu.commands[index];
      break;
    }
  }

  if (!chosenCommand) {
    return invalidCommand(result);
  }

  functionPtr = commands[chosenCommand.action];

  return functionPtr(chosenCommand, entryComponents);
}

var getPrompt = Q.denodeify(prompt.get);

function invalidCommand(result) {
  return Q.fcall(function () {
    if (result.command.length > 0) {
      logger.error('Invalid command: ' + result.command);
    }
  });
}

function showHelpCommand(entryComponents) {
  var commandName;
  var chosenCommand = false;

  return Q.fcall(function() {
    /* entry components must be array of 2 or greater */
    if (entryComponents.length === 2) {
      commandName = entryComponents[1];
    } else {
      commandName = entryComponents[1] + ' ' + entryComponents[2];
    }

    for (var index in menu.commands) {
      if (commandName === menu.commands[index].command) {
        chosenCommand = menu.commands[index];
        break;
      }
    }

    if (!chosenCommand) {
      logger.error('Command: \'%s\' does not exist.');
      return;
    }

    console.log('   Usage: ' + chosenCommand.usage.green);
    console.log('   ' + chosenCommand.description);

    for (index in chosenCommand.details) {
      console.log('   ' + chosenCommand.details[index]);
    }

  });
}

function removeNonStrings(array) {
  for (var index in array) {
    var fieldType = typeof(array[index]);

    if (fieldType === 'function' ||
        fieldType === 'object') {
      delete array[index];
    }
  }
}

function handleError(err) {
  logger.error('%s', err);
}

function commandUsage(chosenCommand) {
  return Q.fcall(function () {
    logger.error('Invalid Syntax for \'%s\'', chosenCommand.command);
    console.log('Usage: ' + chosenCommand.usage);
  });
}

function exit() {
  console.log('So long and thanks for all the fish'.cyan);
  return true;
}

function createApi() {
  return {
    showHelp: function(chosenCommand, entryComponents) {
      if (entryComponents.length >= 2) {
        return showHelpCommand(entryComponents);
      }

      return Q.fcall(function () {
        console.log(sprintf('   ' + '%-70s'.underline, 'Command List:'));
        for (var index in menu.commands) {
          console.log(sprintf('   %s'.green + ' - %s',
                              menu.commands[index].command.green,
                              menu.commands[index].description));
        }
      });
    },

    exit: function(chosenCommand, entryComponents) {
      return Q.fcall(exit);
    },

    showContexts: function(chosenCommand, entryComponents) {
      return dal.context.all()
        .then(function(contexts) {
          console.log('\n   ' + 'domain          '.underline);
          for (var context in contexts) {
            console.log('   ' + contexts[context].domain);
          }
        })
        .catch(handleError);
    },

    showFolders: function(chosenCommand, entryComponents) {
      return dal.folder.all()
        .then(function(folders) {

          console.log('\n   ' + sprintf('%-12s %-6s %-30s'.underline,
                                      'name', 'dtmf', 'recording'));
          for (var x in folders) {
            var folder = folders[x];

            if (x === 'add') {
              /* This is not a folder. */
              continue;
            }

            console.log(sprintf('   %-12s %-6s %s',
              folder.name, folder.dtmf, folder.recording));
          }
        })
        .catch(handleError);
    },

    showFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
      }

      var folderName = entryComponents[2];

      return dal.folder.get(folderName)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf('Folder \'%s\' not found.', folderName));
          }

          removeNonStrings(folder);
          console.log('\n   %j', folder);
        })
        .catch(handleError);
    },

    showMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return commandUsage(chosenCommand);
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

          removeNonStrings(mailbox);
          console.log('\n   %j', mailbox);
        })
        .catch(handleError);
    },

    showMailboxes: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
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
          console.log('\n   ' + sprintf('%-20s %-25s %-25s',
                                        'number',
                                        'email',
                                        'name').underline);

          for (var index in mailboxes) {
            var mailbox = mailboxes[index];
            console.log(sprintf('   %-20s %-25s %-25s',
              mailbox.mailboxNumber + '@' + domain,
              mailbox.email,
              mailbox.name));
          }
        })
        .catch(handleError);
    },

    createContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
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
          console.log('\n   Successfully created context \'%s\''.green,
                      newContextDomain);
        })
        .catch(handleError);
    },

    createMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 6) {
        return commandUsage(chosenCommand);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return commandUsage(chosenCommand);
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
          console.log('\n   Successfully created mailbox \'%s@%s\'.'.green,
                      mailboxNumber, mailboxContext);
        })
        .catch(handleError);
    },

    createFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        return commandUsage(chosenCommand);
      }

      var newFolderName = entryComponents[2];
      var newFolderDTMF = entryComponents[3];
      var newFolderRecording = entryComponents[4];

      return dal.folder.findByNameOrDTMF(newFolderName, newFolderDTMF)
        .then(function(existingFolders) {
          if (existingFolders && existingFolders.length > 0) {
            var conflicts = '';

            for (var index in existingFolders) {
              var folder = existingFolders[index];
              conflicts = conflicts.concat(sprintf('%s (dtmf: %s)%s',
                          folder.name, folder.dtmf,
                          index === existingFolders.length ? '' : ', '));
            }

            throw new Error(sprintf('Requested folder conflicts with ' +
                                    'existing folders: %s', conflicts));
          }

          var newFolder = dal.folder.create({'name': newFolderName,
                               'dtmf': newFolderDTMF,
                               'recording': newFolderRecording});

          return dal.folder.save(newFolder);
        })
        .then(function() {
          console.log('\n   Successfully created folder \'%s\''.green,
                      newFolderName);
        })
        .catch(handleError);
    },

    editContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 4) {
        return commandUsage(chosenCommand);
      }

      var domain = entryComponents[2];
      var newValue = entryComponents[3];

      if (newValue.length < 1) {
        return commandUsage(chosenCommand);
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
          console.log('\n   Context \'%s\' changed to \'%s\''.green,
                      domain, newValue);
        })
        .catch(handleError);
    },

    editMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        return commandUsage(chosenCommand);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return commandUsage(chosenCommand);
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
          console.log('\n   Mailbox \'%s%s\' updated'.green,
                      mailboxNumber, mailboxContext);
        })
        .catch(handleError);
    },

    editFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        return commandUsage(chosenCommand);
      }

      var folderName = entryComponents[2];
      var field = entryComponents[3];
      var newValue = entryComponents[4];

      if (newValue.length < 1) {
        return commandUsage(chosenCommand);
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
            console.log('\n   Folder \'%s\' changed to \'%s\''.green,
                        folderName, newValue);
          })
          .catch(handleError);
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
          console.log('\n   Folder \'%s\' updated'.green, folderName);
        })
        .catch(handleError);
    },

    deleteMessages: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return commandUsage(chosenCommand);
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
          console.log(sprintf('\n   Deleted %s messages'.green,
                              messageCount));
        })
        .catch(handleError);
    },

    deleteMailbox: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
      }

      var mailboxKey = entryComponents[2].split('@');

      if (mailboxKey.length !== 2) {
        return commandUsage(chosenCommand);
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
          console.log(sprintf('\n   Deleted mailbox \'%s@%s\''.green,
                              mailboxNumber, mailboxContext));
        })
        .catch(handleError);
    },

    deleteFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
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
          console.log(sprintf('\n   Deleted folder \'%s\''.green,
                              folderName));
        })
        .catch(handleError);
    },

    deleteContext: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        return commandUsage(chosenCommand);
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
          console.log(sprintf('\n   Deleted context \'%s\''.green,
                              domain));
        })
        .catch(handleError);
    }
  };
}

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

function create(dependencies) {
  dal = dependencies.dal;
  logger = dependencies.logger;

  prompt.start();
  return getPrompt(inputIndicator)
  .then(function (result) {
    processOptionPrompt(result);
  });
}

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
