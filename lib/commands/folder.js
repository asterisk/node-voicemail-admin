/**
 * Voicemail Administrator Folder Commands.
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
    showFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var folderName = entryComponents[2];

      return dal.folder.get(folderName)
        .then(function(folder) {
          if (!folder) {
            throw new Error(sprintf('Folder \'%s\' not found.', folderName));
          }

          common.removeNonValues(folder);
          logger.info('%j', folder);
        });
    },

    showFolders: function(chosenCommand, entryComponents) {
      return dal.folder.all()
        .then(function(folders) {

          logger.info(sprintf('%-12s %-6s %-30s'.underline,
                              'name', 'dtmf', 'recording'));
          for (var key in folders) {
            var folder = folders[key];

            if (typeof(folder) === 'function') {
              continue;
            }

            logger.info(sprintf('%-12s %-6s %s',
              folder.name, folder.dtmf, folder.recording));
          }
        });
    },

    createFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
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

    editFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 5) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
      }

      var folderName = entryComponents[2];
      var field = entryComponents[3];
      var newValue = entryComponents[4];

      if (newValue.length < 1) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
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

    deleteFolder: function(chosenCommand, entryComponents) {
      if (entryComponents.length !== 3) {
        throw new Error(sprintf('Invalid Syntax for \'%s %s\'',
          entryComponents[0], entryComponents[1]));
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
