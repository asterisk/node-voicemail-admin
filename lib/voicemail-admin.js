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
var commands;

var sprintf = require('sprintf').sprintf;

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
    if (!result) {
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

    chosenCommand = menu.commands[baseCommand.toLowerCase()];

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

  if (chosenCommand.details) {
    chosenCommand.details.forEach(function (detail) {
      logger.info(detail);
    });
  }
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
function createApi(dependencies) {
  var systemCommands = {
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
    }
  };

  var contextCommands =
    require('./commands/context.js').createCommands(dependencies);
  var folderCommands =
    require('./commands/folder.js').createCommands(dependencies);
  var mailboxCommands =
    require('./commands/mailbox.js').createCommands(dependencies);

  var commands = {};
  var attrname;
  for (attrname in systemCommands) {
    commands[attrname] = systemCommands[attrname];
  }
  for (attrname in contextCommands) {
    commands[attrname] = contextCommands[attrname];
  }
  for (attrname in folderCommands) {
    commands[attrname] = folderCommands[attrname];
  }
  for (attrname in mailboxCommands) {
    commands[attrname] = mailboxCommands[attrname];
  }

  return commands;
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
  commands = createApi(dependencies);


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
  commands = createApi(dependencies);
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
