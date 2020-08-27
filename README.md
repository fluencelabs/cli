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
$ fluence (-v|--version|version)
fluence-cli/0.0.1 linux-x64 node-v12.13.1
$ fluence --help [COMMAND]
USAGE
  $ fluence COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`fluence add_blueprint`](#fluence-add_blueprint)
* [`fluence add_module`](#fluence-add_module)
* [`fluence blueprints`](#fluence-blueprints)
* [`fluence call`](#fluence-call)
* [`fluence create_service`](#fluence-create_service)
* [`fluence help [COMMAND]`](#fluence-help-command)
* [`fluence interfaces`](#fluence-interfaces)
* [`fluence modules`](#fluence-modules)

## `fluence add_blueprint`

Add a blueprint to a node.

```
USAGE
  $ fluence add_blueprint

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -d, --deps=deps              (required) List of blueprint dependencies
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -n, --name=name              (required) A name of a blueprint
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -t, --targetPeer=targetPeer  Host to connect to

EXAMPLE
  $ fluence add_blueprint
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/add_blueprint.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/add_blueprint.ts)_

## `fluence add_module`

Add a module to a node.

```
USAGE
  $ fluence add_module

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -a, --path=path              (required) A path to a WASM module
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -n, --name=name              (required) A name of a module
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -t, --targetPeer=targetPeer  Host to connect to

EXAMPLE
  $ fluence add_module
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/add_module.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/add_module.ts)_

## `fluence blueprints`

Get a list of blueprints from a node.

```
USAGE
  $ fluence blueprints

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -t, --targetPeer=targetPeer  Host to connect to

EXAMPLE
  $ fluence blueprints
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/blueprints.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/blueprints.ts)_

## `fluence call`

Call a service.

```
USAGE
  $ fluence call

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -a, --args=args              (required) Arguments
  -f, --fname=fname            Name of a function
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -m, --module=module          (required) Id of a module
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -s, --service=service        (required) Id of a service

  -t, --targetPeer=targetPeer  (required) Host to connect to

EXAMPLE
  $ fluence call
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/call.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/call.ts)_

## `fluence create_service`

Create a service by a blueprint.

```
USAGE
  $ fluence create_service

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -b, --blueprint=blueprint    (required) A blueprint to create a service
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -t, --targetPeer=targetPeer  Host to connect to

EXAMPLE
  $ fluence create_service
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/create_service.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/create_service.ts)_

## `fluence help [COMMAND]`

display help for fluence

```
USAGE
  $ fluence help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_

## `fluence interfaces`

Get a list of interfaces from a node.

```
USAGE
  $ fluence interfaces

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -t, --targetPeer=targetPeer  Host to connect to

EXAMPLE
  $ fluence interfaces
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/interfaces.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/interfaces.ts)_

## `fluence modules`

Get a list of modules from a node.

```
USAGE
  $ fluence modules

OPTIONS
  -P, --peer=peer              (required) Host to connect to
  -h, --help                   show CLI help
  -h, --host=host              [default: 127.0.0.1] Host to connect to
  -p, --port=port              [default: 9100] Port to connect to

  -s, --secretKey=secretKey    Client's secret key. A new one will be generated and printed if this flag is not
                               specified

  -t, --targetPeer=targetPeer  Host to connect to

EXAMPLE
  $ fluence modules
  [
     '..',
     '..'
  ]
```

_See code: [src/commands/modules.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.1/src/commands/modules.ts)_
<!-- commandsstop -->
