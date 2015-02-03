# Asterisk Voicemail Administrator Application

A command line administration tool for managing mailboxes in Asterisk voicemail

# Installation

```bash
$ git clone https://github.com/asterisk/node-voicemail-admin.git
$ cd node-voicemail-admin
$ npm install
```

# Usage

```bash
$ node app.js

This will run the application. If this is the your first time running the
application or the database.json config is removed, then you will be
prompted to enter a database connector and a database URL. Afterwards,
running app.js again will launch the node-voicemail-admin command line
interface.

While in the command line interface, enter 'help' get get a list of commands.
In depth instruction for specific commands can be obtained by entering
'help <command_name>'

When finished, enter 'exit' to close the program.
```

# Development

After cloning the git repository, run the following command to install the module and all dev dependencies:

```bash
$ npm install
$ npm link
```

Then run the following to run jshint and mocha tests:

```bash
$ grunt
```

jshint will enforce a minimal style guide. It is also a good idea to create unit tests when adding new features.

Unit test fixtures are stored under test/helpers/fixtures.json and are used to populate the test database before each test runs.

To generate a test coverage report run the following command:

```bash
$ grunt coverage
```

This will also ensure a coverage threshold is met by the tests.

# License

Apache, Version 2.0. Copyright (c) 2015, Digium, Inc. All rights reserved.

