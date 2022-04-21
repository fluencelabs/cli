fluence-cli
===========

CLI to work with Fluence network

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/fluence-cli.svg)](https://npmjs.org/package/fluence-cli)
[![CircleCI](https://circleci.com/gh/fluencelabs/fluence-cli/tree/master.svg?style=shield)](https://circleci.com/gh/fluencelabs/fluence-cli/tree/master)
[![Downloads/week](https://img.shields.io/npm/dw/fluence-cli.svg)](https://npmjs.org/package/fluence-cli)
[![License](https://img.shields.io/npm/l/fluence-cli.svg)](https://github.com/fluencelabs/fluence-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g fluence-cli
$ fluence COMMAND
running command...
$ fluence (--version)
fluence-cli/0.0.0 linux-x64 node-v16.14.0
$ fluence --help [COMMAND]
USAGE
  $ fluence COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`fluence help [COMMAND]`](#fluence-help-command)
* [`fluence plugins`](#fluence-plugins)
* [`fluence plugins:install PLUGIN...`](#fluence-pluginsinstall-plugin)
* [`fluence plugins:inspect PLUGIN...`](#fluence-pluginsinspect-plugin)
* [`fluence plugins:install PLUGIN...`](#fluence-pluginsinstall-plugin-1)
* [`fluence plugins:link PLUGIN`](#fluence-pluginslink-plugin)
* [`fluence plugins:uninstall PLUGIN...`](#fluence-pluginsuninstall-plugin)
* [`fluence plugins:uninstall PLUGIN...`](#fluence-pluginsuninstall-plugin-1)
* [`fluence plugins:uninstall PLUGIN...`](#fluence-pluginsuninstall-plugin-2)
* [`fluence plugins update`](#fluence-plugins-update)

## `fluence help [COMMAND]`

Display help for fluence.

```
USAGE
  $ fluence help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fluence.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.12/src/commands/help.ts)_

## `fluence plugins`

List installed plugins.

```
USAGE
  $ fluence plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ fluence plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.0.11/src/commands/plugins/index.ts)_

## `fluence plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ fluence plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ fluence plugins add

EXAMPLES
  $ fluence plugins:install myplugin 

  $ fluence plugins:install https://github.com/someuser/someplugin

  $ fluence plugins:install someuser/someplugin
```

## `fluence plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ fluence plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ fluence plugins:inspect myplugin
```

## `fluence plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ fluence plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Installs a plugin into the CLI.

  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ fluence plugins add

EXAMPLES
  $ fluence plugins:install myplugin 

  $ fluence plugins:install https://github.com/someuser/someplugin

  $ fluence plugins:install someuser/someplugin
```

## `fluence plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ fluence plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLES
  $ fluence plugins:link myplugin
```

## `fluence plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ fluence plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ fluence plugins unlink
  $ fluence plugins remove
```

## `fluence plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ fluence plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ fluence plugins unlink
  $ fluence plugins remove
```

## `fluence plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ fluence plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ fluence plugins unlink
  $ fluence plugins remove
```

## `fluence plugins update`

Update installed plugins.

```
USAGE
  $ fluence plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```
<!-- commandsstop -->
