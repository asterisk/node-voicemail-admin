/**
 *  Grunt tasks to support running linter and unit tests.
 *
 *  @module Gruntfile
 *
 *  @copyright 2014, Digium, Inc.
 *  @license Apache License, Version 2.0
 *  @author Samuel Fortier-Galarneau <sgalarneau@digium.com>
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    // Task configuration.
    jshint: {
      options: {
        jshintrc: true
      },
      all: [
        'Gruntfile.js',
        'lib/*.js',
        'lib/commands/*.js',
        'test/*.js',
        'app.js',
        'createtables.js',
        'test/mock_dal/*.js',
        'test/mock_dal/helpers/*.js',
        'test/mock_dal/repositories/*.js'
      ]
    },
    mochaTest: {
      test: {
        options: {
          mocha: require('mocha'),
          reporter: 'spec',
          timeout: 2000
        },
        src: ['test/*.js']
      }
    },

    'mocha_istanbul': {
      coverage: {
        src: ['test/*.js'],
        options: {
          check: {
            lines: 80,
            statements: 80,
            functions: 80,
            branches: 50
          }
        }
      }
    }
  });

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-mocha-istanbul');

  // Default task.
  grunt.registerTask('default', ['jshint', 'mochaTest']);
  grunt.registerTask('coverage', ['mocha_istanbul:coverage']);
};
