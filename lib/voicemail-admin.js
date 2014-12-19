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

var db = require('../database.json').db;
var logger = require('voicemail-logging').create(
    require('../config.json'),
    'voicemail-admin'
);
var dal = require('voicemail-data')(db, {
  logger: logger
});
var sprintf = require('sprintf').sprintf;

var commands = createApi();

prompt.message = '';
prompt.delimiter = '';
var input_indicator = {
  name: 'command',
  message: "=>".green
};

function processOption(err, result) {
  var entry_components;
  var base_command;
  var chosen_command = false;
  var function_ptr;

  if (!result) {
    return exit();
  }

  /* Split the string by spaces, but keep stuff between quotes together */
  entry_components = result.command.match(/(?:[^\s"]+|"[^"]*")+/g);
  for (var index in entry_components) {
    entry_components[index] = entry_components[index].replace(/"/g, "");
  }

  if (!entry_components) {
    return;
  }

  /* help is the only single word command -- everything else is two words */
  if (entry_components.length === 1 || entry_components[0] === 'help' ||
      entry_components[0] === 'exit') {
    base_command = entry_components[0];
  } else {
    base_command = entry_components[0] + ' ' + entry_components[1];
  }

  for (var index in menu.commands) {
    if (base_command === menu.commands[index].command) {
      chosen_command = menu.commands[index];
      break;
    }
  }

  if (!chosen_command) {
    return invalidCommand(result);
  }

  function_ptr = commands[chosen_command.action];

  return function_ptr(chosen_command, entry_components);
}

function processOptionPrompt(err, result) {
  if (processOption(err, result)) {
    return;
  }

  prompt.get(input_indicator, processOptionPrompt);
}

function invalidCommand(result) {
  if (result.command.length > 0) {
    console.log('Invalid command: '.red + result.command);
  }
}

function showHelpCommand(entry_components) {
  var command_name;
  var chosen_command = false;

  /* entry components must be array of 2 or greater */
  if (entry_components.length == 2) {
    command_name = entry_components[1];
  } else {
    command_name = entry_components[1] + ' ' + entry_components[2];
  }

  for (var index in menu.commands) {
    if (command_name === menu.commands[index].command) {
      chosen_command = menu.commands[index];
      break;
    }
  }

  if (!chosen_command) {
    console.log("   Command: '%s' does not exist.",
                command_name.green);
    return;
  }

  console.log('   Usage: ' + chosen_command.usage.green);
  console.log('   ' + chosen_command.description);

  for (index in chosen_command.details) {
    console.log('   ' + chosen_command.details[index]);
  }
}

function removeNonStrings(array) {
  for (var index in array) {
    var field_type = typeof(array[index]);

    if (field_type === "function" ||
        field_type === "object") {
      delete array[index];
    }
  }
}

function redrawPrompt() {
  process.stdout.write("=>".green + " ");
}

function handleError(err) {
  console.log("\n   %s".red, err);
  redrawPrompt();
}

function commandUsage(chosen_command) {
  console.log("   Invalid Syntax for '%s'".red, chosen_command.command);
  console.log('   Usage: ' + chosen_command.usage.green);
}

function exit() {
  console.log("   So long and thanks for all the fish".cyan);
  return true;
}

function createApi() {
  return {
    showHelp: function(chosen_command, entry_components) {
      if (entry_components.length >= 2) {
        showHelpCommand(entry_components);
      } else {
        console.log(sprintf('   ' + '%-70s'.underline, 'Command List:'));
        for (var index in menu.commands) {
          console.log(sprintf('   %s'.green + ' - %s',
                              menu.commands[index].command.green,
                              menu.commands[index].description));
        }
      }
    },

    exit: function(chosen_command, entry_components) {
      return exit();
    },

    showContexts: function(chosen_command, entry_components) {
      dal.context.all()
        .then(function(contexts) {
          console.log();
          console.log("   " + "domain          ".underline);
          for (var context in contexts) {
            console.log("   " + contexts[context].domain);
          }

          redrawPrompt();
        })
        .catch(handleError);
    },

    showFolders: function(chosen_command, entry_components) {
      dal.folder.all()
        .then(function(folders) {

          console.log();
          console.log("   " + sprintf("%-12s %-6s %-30s".underline,
                                      "name", "dtmf", "recording"));
          for (var x in folders) {
            var folder = folders[x];

            if (x === 'add') {
              /* This is not a folder. */
              continue;
            }

            console.log(sprintf("   %-12s %-6s %s",
              folder.name, folder.dtmf, folder.recording));
          }

          redrawPrompt();
        })
        .catch(handleError);
    },

    showFolder: function(chosen_command, entry_components) {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var folder_name = entry_components[2];

      dal.folder.get(folder_name)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf("Folder '%s' not found.", folder_name));
          }

          removeNonStrings(folder);
          console.log("\n   %j", folder);
          redrawPrompt();
        })
        .catch(handleError);
    },

    showMailbox: function(chosen_command, entry_components) {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var mailbox_key = entry_components[2].split('@');

      if (mailbox_key.length != 2) {
        return commandUsage(chosen_command);
      }

      var mailbox_number = mailbox_key[0];
      var mailbox_context = mailbox_key[1];

      dal.context.get(mailbox_context)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Mailbox '%s@%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          return dal.mailbox.get(mailbox_number, context);
        })
        .then(function(mailbox) {
          if (!mailbox) {
            throw new Error(sprintf("Mailbox '%s@%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          removeNonStrings(mailbox);
          console.log("\n   %j", mailbox);
          redrawPrompt();
        })
        .catch(handleError);
    },

    showMailboxes: function(chosen_command, entry_components) {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var domain = entry_components[2];

      dal.context.get(domain)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Context '%s' not found.", domain));
          }

          return dal.mailbox.allContext(context);
        })
        .then(function(mailboxes) {
          console.log();
          console.log("   " + sprintf("%-20s %-25s %-25s",
                                      "number",
                                      "email",
                                      "name").underline);

          for (var index in mailboxes) {
            var mailbox = mailboxes[index];
            console.log(sprintf("   %-20s %-25s %-25s",
              mailbox.mailboxNumber + '@' + domain,
              mailbox.email,
              mailbox.name));
          }

          redrawPrompt();
        })
        .catch(handleError);
    },

    createContext: function(chosen_command, entry_components) {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var new_context_domain = entry_components[2];
      var new_context = dal.context.create(new_context_domain);

      dal.context.get(new_context_domain)
        .then(function(existing_context) {
          if (existing_context) {
            throw new Error(sprintf("Context with domain '%s' already exists.",
                                    new_context_domain));
          }

          return dal.context.save(new_context);
        })
        .then(function() {
          console.log("\n   Successfully created context '%s'".green,
                      new_context_domain);
          redrawPrompt();
        })
        .catch(handleError);
    },

    createMailbox: function(chosen_command, entry_components) {
      if (entry_components.length != 6) {
        return commandUsage(chosen_command);
      }

      var mailbox_key = entry_components[2].split('@');

      if (mailbox_key.length != 2) {
        return commandUsage(chosen_command);
      }

      var mailbox_number = mailbox_key[0];
      var mailbox_context = mailbox_key[1];
      var password = entry_components[3];
      var name = entry_components[4];
      var email = entry_components[5];
      var hold_context;

      dal.context.get(mailbox_context)
        .then(function(context) {
          hold_context = context;

          if (!context) {
            throw new Error(sprintf("Context '%s' requested for '%s@%s' " +
                                    "does not exist.", mailbox_context,
                                    mailbox_number, mailbox_context));
          }

          return dal.mailbox.get(mailbox_number, context);
        })
        .then(function(existing_mailbox) {
          if (existing_mailbox) {
            throw new Error(sprintf("Requested mailbox '%s@%s' already " +
                                    "exists.", mailbox_number,
                                    mailbox_context));
          }

          var mailbox = dal.mailbox.create(mailbox_number, hold_context);
          mailbox.password = password;
          mailbox.name = name;
          mailbox.email = email;

          return dal.mailbox.save(mailbox);
        })
        .then(function() {
          console.log("\n   Successfully created mailbox '%s@%s'.".green,
                      mailbox_number, mailbox_context);
          redrawPrompt();
        })
        .catch(handleError);
    },

    createFolder: function(chosen_command, entry_components) {
      if (entry_components.length != 5) {
        return commandUsage(chosen_command);
      }

      var new_folder_name = entry_components[2];
      var new_folder_dtmf = entry_components[3];
      var new_folder_recording = entry_components[4];

      dal.folder.getNameOrDTMF(new_folder_name, new_folder_dtmf)
        .then(function(existing_folders) {
          if (existing_folders && existing_folders.length > 0) {
            var conflicts = "";

            for (var index in existing_folders) {
              var folder = existing_folders[index];
              conflicts = conflicts.concat(sprintf("%s (dtmf: %s)%s",
                          folder.name, folder.dtmf,
                          index === existing_folders.length ? "" : ", "));
            }

            throw new Error(sprintf("Requested folder conflicts with " +
                                    "existing folders: %s", conflicts));
          }

          var new_folder = dal.folder.create({"name": new_folder_name,
                               "dtmf": new_folder_dtmf,
                               "recording": new_folder_recording});

          return dal.folder.save(new_folder);
        })
        .then(function() {
          console.log("\n   Successfully created folder '%s'".green,
                      new_folder_name);
          redrawPrompt();
        })
        .catch(handleError);
    },

    editContext: function(chosen_command, entry_components) {
      if (entry_components.length != 4) {
        return commandUsage(chosen_command);
      }

      var domain = entry_components[2];
      var new_value = entry_components[3];

      if (new_value.length < 1) {
        return commandUsage(chosen_command);
      }

      dal.context.get(new_value)
        .then(function(existing_context) {
          /* Prevent creation of duplicate domains */
          if (existing_context) {
            throw new Error(sprintf("A context with domain '%s' already " +
                                    "exists.", new_value));
          }

          return dal.context.get(domain);
        })
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Context '%s' not found.", domain));
          }

          context.domain = new_value;
          return dal.context.save(context);
        })
        .then(function() {
          console.log("\n   Context '%s' changed to '%s'".green,
                      domain, new_value);
          redrawPrompt();
        })
        .catch(handleError);
    },

    editMailbox: function(chosen_command, entry_components) {
      if (entry_components.length != 5) {
        return commandUsage(chosen_command);
      }

      var mailbox_key = entry_components[2].split('@');

      if (mailbox_key.length != 2) {
        return commandUsage(chosen_command);
      }

      var mailbox_number = mailbox_key[0];
      var mailbox_context = mailbox_key[1];
      var field = entry_components[3];
      var new_value = entry_components[4];

      dal.context.get(mailbox_context)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Mailbox '%s@%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          return dal.mailbox.get(mailbox_number, context);
        })
        .then(function(mailbox) {
          if (!mailbox) {
            throw new Error(sprintf("Mailbox '%s@%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          if (field === 'mailboxName') {
            mailbox.mailboxName = new_value;
          } else if (field === 'password') {
            mailbox.password = new_value;
          } else if (field === 'name') {
            mailbox.name = new_value;
          } else if (field === 'email') {
            mailbox.email = new_value;
          } else {
            throw new Error(sprintf("'%s' is not an editable property of " +
                                    "mailboxes.", field));
          }

          return dal.mailbox.save(mailbox);
        })
        .then(function() {
          console.log("\n   Mailbox '%s%s' updated".green,
                      mailbox_number, mailbox_context);
          redrawPrompt();
        })
        .catch(handleError);
    },

    editFolder: function(chosen_command, entry_components) {
      if (entry_components.length != 5) {
        return commandUsage(chosen_command);
      }

      var folder_name = entry_components[2];
      var field = entry_components[3];
      var new_val = entry_components[4];

      if (new_val.length < 1) {
        return commandUsage(chosen_command);
      }

      /* name changes have to be handled via a separate mechanism from other
       * fields since pre-existing folders might cause conflicts */
      if (field === 'name') {
        dal.folder.get(new_val)
          .then(function(existing_folder) {
            if (existing_folder) {
              throw new Error(sprintf("A folder named '%s' already exists.",
                                      new_val));
            }

            return dal.folder.get(folder_name);
          })
          .then(function(folder) {
            if (!folder) {
              throw new Error(sprintf("Folder '%s' not found.", folder_name));
            }

            folder.name = new_val;
            return dal.folder.save(folder);
          })
          .then(function() {
            console.log("\n   Folder '%s' changed to '%s'".green,
                        folder_name, new_val);
            redrawPrompt();
          })
          .catch(handleError);
          return;
      }

      dal.folder.get(folder_name)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf("Folder '%s' not found.", folder_name));
          }

          if (field === 'dtmf') {
            folder.dtmf = new_val;
          } else if (field === 'recording') {
            folder.recording = new_val;
          } else {
            throw new Error(sprintf("'%s' is not an editable property of " +
                                    "folders.", field));
          }

          return dal.folder.save(folder);
        })
        .then(function(result) {
          console.log("\n   Folder '%s' updated".green, folder_name);
          redrawPrompt();
        })
        .catch(handleError);
    },

    deleteMessages: function(chosen_command, entry_components)
    {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var mailbox_key = entry_components[2].split('@');

      if (mailbox_key.length != 2) {
        return commandUsage(chosen_command);
      }

      var mailbox_number = mailbox_key[0];
      var mailbox_context = mailbox_key[1];
      var message_count;
      var active_mailbox;

      var promise = dal.context.get(mailbox_context)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Mailbox '%s@%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          return dal.mailbox.get(mailbox_number, context);
        })
        .then(function(mailbox) {
          active_mailbox = mailbox;

          if (!active_mailbox) {
            throw new Error(sprintf("Mailbox '%s@%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          return dal.message.countMailbox(active_mailbox);
        })
        .then(function(count) {
          message_count = count;

          if (!message_count) {
            return;
          }

          return dal.message.removeMailbox(active_mailbox);
        })
        .then(function() {
          console.log(sprintf("\n   Deleted %s messages".green,
                              message_count));
          redrawPrompt();
        })
        .catch(handleError);
    },

    deleteMailbox: function(chosen_command, entry_components)
    {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var mailbox_key = entry_components[2].split('@');

      if (mailbox_key.length != 2) {
        return commandUsage(chosen_command);
      }

      var mailbox_number = mailbox_key[0];
      var mailbox_context = mailbox_key[1];
      var message_count;
      var active_mailbox;

      dal.context.get(mailbox_context)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Mailbox '%s%s' not found.",
                            mailbox_number, mailbox_context));
          }

          return dal.mailbox.get(mailbox_number, context);
        })
        .then(function(mailbox) {
          active_mailbox = mailbox;

          if (!active_mailbox) {
            throw new Error(sprintf("Mailbox '%s%s' not found.",
                                    mailbox_number, mailbox_context));
          }

          return dal.message.countMailbox(active_mailbox);
        })
        .then(function(count) {
          if (count) {
            throw new Error(sprintf("Mailbox '%s@%s' has %s messages in it " +
                                    "that must be deleted first.",
                                    mailbox_number, mailbox_context, count));
          }

          return dal.mailbox.remove(active_mailbox);
        })
        .then(function() {
          console.log(sprintf("\n   Deleted mailbox '%s@%s'".green,
                              mailbox_number, mailbox_context));
          redrawPrompt();
        })
        .catch(handleError);
    },

    deleteFolder: function(chosen_command, entry_components)
    {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var folder_name = entry_components[2];
      var active_folder;

      dal.folder.get(folder_name)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf("Folder '%s' not found.",
                                    folder_name));
          }

          active_folder = folder;
          return dal.message.countFolder(active_folder);
        })
        .then(function(count) {
          if (count) {
            throw new Error(sprintf("Folder '%s' has %s messages in it that " +
                                    "must be deleted first.",
                                    folder_name, count));
          }

          return dal.folder.remove(active_folder);
        })
        .then(function() {
          console.log(sprintf("\n   Deleted folder '%s'".green,
                              folder_name));
          redrawPrompt();
        })
        .catch(handleError);
    },

    deleteContext: function(chosen_command, entry_components)
    {
      if (entry_components.length != 3) {
        return commandUsage(chosen_command);
      }

      var domain = entry_components[2];
      var active_context;

      dal.context.get(domain)
        .then(function(context) {
          if (!context) {
            throw new Error(sprintf("Context '%s' not found.",
                                    domain));
          }

          active_context = context;

          return dal.mailbox.countContext(active_context);
        })
        .then(function(count) {
          if (count) {
            throw new Error(sprintf("Context '%s' contains %s mailboxes " +
                                    "that must be deleted first.",
                                    domain, count));
          }

          return dal.context.remove(active_context);
        })
        .then(function() {
          console.log(sprintf("\n   Deleted context '%s'".green,
                              domain));
          redrawPrompt();
        })
        .catch(handleError);
    }
  };
}

function create() {
  prompt.start();



  prompt.get(input_indicator, processOptionPrompt);
}

/**
 * Returns module functions.
 *
 * @returns {object} module - module functions
 */
module.exports = {
  create: create,
  processOption: processOption
};
