Fluence CLI
===

A tool that makes working with Fluence network more convenient

## Table of contents:

<!-- toc -->
* [Prerequisites](#prerequisites)
* [Contributing](#contributing)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Prerequisites

- [Node.js >=16.0.0](https://nodejs.org/)

# Contributing

To run cli in development mode use: `./bin/dev`

To run cli in production mode run `npm run build` first, then use: `./bin/run`

If you are using nvm and want to commit using VSCode - place `.huskyrc` file to your Home directory

# Usage

<!-- usage -->
```sh-session
$ npm install -g @fluencelabs/cli
$ fluence COMMAND
running command...
$ fluence (--version)
@fluencelabs/cli/0.0.2 linux-x64 node-v16.14.0
$ fluence --help [COMMAND]
USAGE
  $ fluence COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`fluence autocomplete [SHELL]`](#fluence-autocomplete-shell)
* [`fluence deploy [NAME] [--timeout <milliseconds>] [-k <name>]`](#fluence-deploy-name---timeout-milliseconds--k-name)
* [`fluence help [COMMAND]`](#fluence-help-command)
* [`fluence init [NAME]`](#fluence-init-name)
* [`fluence plugins`](#fluence-plugins)
* [`fluence plugins:install PLUGIN...`](#fluence-pluginsinstall-plugin)
* [`fluence plugins:inspect PLUGIN...`](#fluence-pluginsinspect-plugin)
* [`fluence plugins:install PLUGIN...`](#fluence-pluginsinstall-plugin-1)
* [`fluence plugins:link PLUGIN`](#fluence-pluginslink-plugin)
* [`fluence plugins:uninstall PLUGIN...`](#fluence-pluginsuninstall-plugin)
* [`fluence plugins:uninstall PLUGIN...`](#fluence-pluginsuninstall-plugin-1)
* [`fluence plugins:uninstall PLUGIN...`](#fluence-pluginsuninstall-plugin-2)
* [`fluence plugins update`](#fluence-plugins-update)
* [`fluence remove [NAME] [--timeout <milliseconds>]`](#fluence-remove-name---timeout-milliseconds)
* [`fluence run [--on <peer_id>] [--aqua <path>] [-f <function-call>] [--relay <multiaddr>] [--timeout <milliseconds>]`](#fluence-run---on-peer_id---aqua-path--f-function-call---relay-multiaddr---timeout-milliseconds)
* [`fluence update [CHANNEL]`](#fluence-update-channel)

## `fluence autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ fluence autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ fluence autocomplete

  $ fluence autocomplete bash

  $ fluence autocomplete zsh

  $ fluence autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v1.3.0/src/commands/autocomplete/index.ts)_

## `fluence deploy [NAME] [--timeout <milliseconds>] [-k <name>]`

Deploy service to the remote peer

```
USAGE
  $ fluence deploy [NAME] [--timeout <milliseconds>] [-k <name>]

ARGUMENTS
  NAME  Deployment config name

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  --timeout=<milliseconds>    Deployment and remove timeout

DESCRIPTION
  Deploy service to the remote peer

EXAMPLES
  $ fluence deploy
```

_See code: [dist/commands/deploy.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.2/dist/commands/deploy.ts)_

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

## `fluence init [NAME]`

Initialize fluence project in the current directory

```
USAGE
  $ fluence init [NAME]

ARGUMENTS
  NAME  Project name

DESCRIPTION
  Initialize fluence project in the current directory

EXAMPLES
  $ fluence init
```

_See code: [dist/commands/init.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.2/dist/commands/init.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.0/src/commands/plugins/index.ts)_

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

## `fluence remove [NAME] [--timeout <milliseconds>]`

Remove previously deployed config

```
USAGE
  $ fluence remove [NAME] [--timeout <milliseconds>]

ARGUMENTS
  NAME  Deployment config name

FLAGS
  --timeout=<milliseconds>  Remove timeout

DESCRIPTION
  Remove previously deployed config

EXAMPLES
  $ fluence remove
```

_See code: [dist/commands/remove.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.2/dist/commands/remove.ts)_

## `fluence run [--on <peer_id>] [--aqua <path>] [-f <function-call>] [--relay <multiaddr>] [--timeout <milliseconds>]`

Run aqua script

```
USAGE
  $ fluence run [--on <peer_id>] [--aqua <path>] [-f <function-call>] [--relay <multiaddr>] [--timeout <milliseconds>]

FLAGS
  -f, --func=<function-call>  Function call
  --aqua=<path>               Path to an aqua file or to a directory that contains your aqua files
  --on=<peer_id>              PeerId of the peer where you want to run the function
  --relay=<multiaddr>         Relay node MultiAddress
  --timeout=<milliseconds>    Run timeout

DESCRIPTION
  Run aqua script

EXAMPLES
  $ fluence run
```

_See code: [dist/commands/run.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.2/dist/commands/run.ts)_

## `fluence update [CHANNEL]`

update the fluence CLI

```
USAGE
  $ fluence update [CHANNEL] [-a] [-v <value> | -i] [--force]

FLAGS
  -a, --available        Install a specific version.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
  --force                Force a re-download of the requested version.

DESCRIPTION
  update the fluence CLI

EXAMPLES
  Update to the stable channel:

    $ fluence update stable

  Update to a specific version:

    $ fluence update --version 1.0.0

  Interactively select version:

    $ fluence update --interactive

  See available versions:

    $ fluence update --available
```

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v3.0.0/src/commands/update.ts)_
<!-- commandsstop -->
