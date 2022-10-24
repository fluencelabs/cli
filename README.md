Fluence CLI
===

A tool that makes working with Fluence network more convenient

## Table of contents:

<!-- toc -->
* [Prerequisites](#prerequisites)
* [Usage](#usage)
* [Currently supported workflow example](#currently-supported-workflow-example)
* [Contributing](#contributing)
* [Commands](#commands)
<!-- tocstop -->

# Prerequisites

- Linux or MacOS (currently have some bugs on windows)
- [Node.js >=16.0.0](https://nodejs.org/)

# Usage

<!-- usage -->
```sh-session
$ npm install -g @fluencelabs/cli
$ fluence COMMAND
running command...
$ fluence (--version)
@fluencelabs/cli/0.0.0 linux-x64 node-v16.14.0
$ fluence --help [COMMAND]
USAGE
  $ fluence COMMAND
...
```
<!-- usagestop -->

# Currently supported workflow example

A lot of what is described next will be improved and automated in the future (key-management etc.) Currently Fluence CLI is a convenience wrapper around Aqua CLI and Marine

1. Run `fluence init my-fluence-project` to initialize new project
2. Go to the newly initialized project dir (`cd my-fluence-project`). Pay attention to the newly generated `fluence.yaml` file in the project's root directory - it's your application configuration. All configs produced by fluence cli have schema for intellisense and validation and commented-out help so you can read about the config right inside the config itself
3. Dependencies, especially rust ones, such as `marine` and `mrepl`, take very long to install so if you are definitely planning to use them do `fluence dependency install` (or short version of the command: `fluence dependency i`) to install all the dependencies listed in `fluence.yaml`. It will take a while so go drink a cup of coffee while it's happening. All dependencies are cached to the user's `.fluence` dir so if you init a different project with the same versions of the dependencies - you will be able to run `fluence dependency install` there almost instantly
4. Run `fluence service add 'https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true'`. `fluence.yaml` will be updated to look like this:
```yaml
version: 1
services:
  adder:
    get: https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true
    deploy:
      - deployId: default
```
`deployId` property is set to `default`, but it can be any string that starts with a lowercase letter and contains only letters, numbers, and underscores. It also must be unique service-wise. `deployId` is used in aqua to access ids of deployed services as you will see in a moment.
You can edit `fluence.yaml` manually if you want to deploy multiple times, deploy on specific network, deploy on specific peerId or if you want to override `service.yaml` service configuration 

5. Run `fluence service new ./src/services/newService` to generate new service template. You will be asked if you want to add the service to `fluence.yaml` - say yes.
6. Run `fluence service repl newService` to build the service and get into the repl
7. Run `fluence deploy` to deploy the application you described in `fluence.yaml`. Services written in rust will be automatically built before deployment. User-level secret key from `~/.fluence/secrets.yaml` will be used to deploy each service (can be overridden using `-k` flag). You can also add project-level secret key to your project `.fluence/secrets.yaml` using `fluence key new` and setup `fluence.yaml` with key-pair names as you wish
8. Write some aqua in `src/aqua/main.aqua`. Example `src/aqua/main.aqua`:
```aqua
module Main

import App from "deployed.app.aqua"

export App, add_one

service AddOne:
    add_one: u64 -> u64

func add_one(value: u64) -> u64:
    services <- App.services()

    on services.adder.default!.peerId:
        AddOne services.adder.default!.serviceId
        res <- AddOne.add_one(value)
    <- res
```
`"deployed.app.aqua"` file was generated after you ran `fluence deploy` and it is located at `.fluence/aqua/deployed.app.aqua`. `App.services()` method returns ids of the previously deployed services that you can use in your aqua code (info about previously deployed services is stored at `.fluence/app.yaml`).

9. Run `fluence run -f 'add_one(1)'`. Function with this name will be searched inside the `src/aqua/main.aqua` (can be overridden with `--input` flag) and executed. 
Alternatively, if you are js developer - import generated `registerApp` function from `.fluence/ts/app.ts` or `.fluence/js/app.js` and execute it after `Fluence.run()` in your js application in order to give access to deployed services ids to your aqua code. Then compile `src/aqua/main.aqua` using `fluence aqua` command. Import and run `add_one(1)` in your js code.
10. Run `fluence remove` to remove the previously deployed fluence application 


# Contributing

To run cli in development mode use: `./bin/dev`

To run cli in production mode run `npm run build` first, then use: `./bin/run`

If you are using nvm and want to commit using VSCode - place `.huskyrc` file to your Home directory

Don't name arguments or flags with names that contain underscore symbols, because autogenerated links in markdown will not work

pre-commit runs each time before you commit. It includes prettier and generates this README.md file. 
If you want README.md file to be correctly generated please don't forget to run `npm run build` before committing

Pull request and release process:
1. Run `npm run check` to make sure everything ok with the code
2. Only after that commit your changes to trigger pre-commit hook that updates `README.md`. Read `README.md` to make sure it is correctly updated
3. Push your changes
4. Create pull request and merge your changes to `main`
5. Switch to `main` locally and pull merged changes
6. Run `git tag -a v0.0.0 -m ""` with version number that you want instead of `0.0.0`
7. Run `git push origin v0.0.0` with version number that you want instead of `0.0.0` to trigger release

# Commands

<!-- commands -->
* [`fluence aqua`](#fluence-aqua)
* [`fluence autocomplete [SHELL]`](#fluence-autocomplete-shell)
* [`fluence dep cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-cargo-i-package-name--package-nameversion)
* [`fluence dep i`](#fluence-dep-i)
* [`fluence dep npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-npm-i-package-name--package-nameversion)
* [`fluence dependency cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-cargo-i-package-name--package-nameversion)
* [`fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-cargo-install-package-name--package-nameversion)
* [`fluence dependency i`](#fluence-dependency-i)
* [`fluence dependency install`](#fluence-dependency-install)
* [`fluence dependency npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-npm-i-package-name--package-nameversion)
* [`fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-npm-install-package-name--package-nameversion)
* [`fluence deploy`](#fluence-deploy)
* [`fluence help [COMMAND]`](#fluence-help-command)
* [`fluence init [PATH]`](#fluence-init-path)
* [`fluence key default [NAME]`](#fluence-key-default-name)
* [`fluence key new [NAME]`](#fluence-key-new-name)
* [`fluence key remove [NAME]`](#fluence-key-remove-name)
* [`fluence module add [PATH | URL]`](#fluence-module-add-path--url)
* [`fluence module new [PATH]`](#fluence-module-new-path)
* [`fluence module remove [NAME | PATH | URL]`](#fluence-module-remove-name--path--url)
* [`fluence remove`](#fluence-remove)
* [`fluence run`](#fluence-run)
* [`fluence service add [PATH | URL]`](#fluence-service-add-path--url)
* [`fluence service new [PATH]`](#fluence-service-new-path)
* [`fluence service remove [NAME | PATH | URL]`](#fluence-service-remove-name--path--url)
* [`fluence service repl [NAME | PATH | URL]`](#fluence-service-repl-name--path--url)

## `fluence aqua`

Compile aqua file or directory that contains your .aqua files

```
USAGE
  $ fluence aqua [-i <value>] [-o <value>] [--import <value>] [--air | --js] [--log-level <value>]
    [--const <value>] [--no-relay] [--no-xor] [--dry] [--scheduled] [-w] [--no-input]

FLAGS
  -i, --input=<path>    Path to an aqua file or an input directory that contains your .aqua files
  -o, --output=<path>   Path to the output directory. Will be created if it doesn't exists
  -w, --watch           Watch aqua file or folder for changes and recompile
  --air                 Generate .air file instead of .ts
  --const=<NAME=value>  Set log level
  --dry                 Checks if compilation is succeeded, without output
  --import=<path>...    Path to a directory to import from. May be used several times
  --js                  Generate .js file instead of .ts
  --log-level=<level>   Set log level
  --no-input            Don't interactively ask for any input from the user
  --no-relay            Do not generate a pass through the relay node
  --no-xor              Do not generate a wrapper that catches and displays errors
  --scheduled           Generate air code for script storage. Without error handling wrappers and hops on relay. Will
                        ignore other options

DESCRIPTION
  Compile aqua file or directory that contains your .aqua files

EXAMPLES
  $ fluence aqua
```

_See code: [dist/commands/aqua.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.0/dist/commands/aqua.ts)_

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

## `fluence dep cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dep cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dep cargo i
```

## `fluence dep i`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dep i [--recommended | --latest] [--no-input]

FLAGS
  --latest       Set recommended versions of @fluencelabs/aqua, marine and mrepl dependencies and install all
                 dependencies from fluence.yaml
  --no-input     Don't interactively ask for any input from the user
  --recommended  Set latest versions of @fluencelabs/aqua, marine and mrepl dependencies and install all dependencies
                 from fluence.yaml

DESCRIPTION
  Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

ALIASES
  $ fluence dependency i
  $ fluence dep i

EXAMPLES
  $ fluence dep i
```

## `fluence dep npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dep npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua@0.7.5-342

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dep npm i
```

## `fluence dependency cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dependency cargo i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dependency cargo i
```

## `fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dependency cargo install
```

## `fluence dependency i`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dependency i [--recommended | --latest] [--no-input]

FLAGS
  --latest       Set recommended versions of @fluencelabs/aqua, marine and mrepl dependencies and install all
                 dependencies from fluence.yaml
  --no-input     Don't interactively ask for any input from the user
  --recommended  Set latest versions of @fluencelabs/aqua, marine and mrepl dependencies and install all dependencies
                 from fluence.yaml

DESCRIPTION
  Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

ALIASES
  $ fluence dependency i
  $ fluence dep i

EXAMPLES
  $ fluence dependency i
```

## `fluence dependency install`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dependency install [--recommended | --latest] [--no-input]

FLAGS
  --latest       Set recommended versions of @fluencelabs/aqua, marine and mrepl dependencies and install all
                 dependencies from fluence.yaml
  --no-input     Don't interactively ask for any input from the user
  --recommended  Set latest versions of @fluencelabs/aqua, marine and mrepl dependencies and install all dependencies
                 from fluence.yaml

DESCRIPTION
  Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

ALIASES
  $ fluence dependency i
  $ fluence dep i

EXAMPLES
  $ fluence dependency install
```

## `fluence dependency npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dependency npm i [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua@0.7.5-342

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dependency npm i
```

## `fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua@0.7.5-342

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dependency npm install
```

## `fluence deploy`

Deploy application, described in fluence.yaml

```
USAGE
  $ fluence deploy [--relay <value>] [--force] [--timeout <value>] [-k <value>] [--no-input]

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  --force                     Force removing of previously deployed app
  --no-input                  Don't interactively ask for any input from the user
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    Timeout used for command execution

DESCRIPTION
  Deploy application, described in fluence.yaml

EXAMPLES
  $ fluence deploy
```

_See code: [dist/commands/deploy.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.0/dist/commands/deploy.ts)_

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

## `fluence init [PATH]`

Initialize fluence project

```
USAGE
  $ fluence init [PATH] [--no-input]

ARGUMENTS
  PATH  Project path

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ fluence init
```

_See code: [dist/commands/init.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.0/dist/commands/init.ts)_

## `fluence key default [NAME]`

Set default key-pair for user or project

```
USAGE
  $ fluence key default [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Set default key-pair for current user instead of current project

DESCRIPTION
  Set default key-pair for user or project

EXAMPLES
  $ fluence key default
```

## `fluence key new [NAME]`

Generate key-pair and store it in user's or project's .fluence/secrets.yaml

```
USAGE
  $ fluence key new [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Generate key-pair for current user instead of generating key-pair for current project

DESCRIPTION
  Generate key-pair and store it in user's or project's .fluence/secrets.yaml

EXAMPLES
  $ fluence key new
```

## `fluence key remove [NAME]`

Remove key-pair from user's or project's .fluence/secrets.yaml

```
USAGE
  $ fluence key remove [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Remove key-pair from current user instead of removing key-pair from current project

DESCRIPTION
  Remove key-pair from user's or project's .fluence/secrets.yaml

EXAMPLES
  $ fluence key remove
```

## `fluence module add [PATH | URL]`

Add module to service.yaml

```
USAGE
  $ fluence module add [PATH | URL] [--no-input] [--name <value>] [--service <value>]

ARGUMENTS
  PATH | URL  Path to a module or url to .tar.gz archive

FLAGS
  --name=<name>            Override module name
  --no-input               Don't interactively ask for any input from the user
  --service=<name | path>  Service name from fluence.yaml or path to the service directory

DESCRIPTION
  Add module to service.yaml

EXAMPLES
  $ fluence module add
```

## `fluence module new [PATH]`

Create new marine module template

```
USAGE
  $ fluence module new [PATH] [--no-input]

ARGUMENTS
  PATH  Module path

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Create new marine module template

EXAMPLES
  $ fluence module new
```

## `fluence module remove [NAME | PATH | URL]`

Remove module from service.yaml

```
USAGE
  $ fluence module remove [NAME | PATH | URL] [--no-input] [--service <value>]

ARGUMENTS
  NAME | PATH | URL  Module name from service.yaml, path to a module or url to .tar.gz archive

FLAGS
  --no-input               Don't interactively ask for any input from the user
  --service=<name | path>  Service name from fluence.yaml or path to the service directory

DESCRIPTION
  Remove module from service.yaml

EXAMPLES
  $ fluence module remove
```

## `fluence remove`

Remove previously deployed config

```
USAGE
  $ fluence remove [--relay <value>] [--timeout <value>] [--no-input]

FLAGS
  --no-input                Don't interactively ask for any input from the user
  --relay=<multiaddr>       Relay node multiaddr
  --timeout=<milliseconds>  Timeout used for command execution

DESCRIPTION
  Remove previously deployed config

EXAMPLES
  $ fluence remove
```

_See code: [dist/commands/remove.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.0/dist/commands/remove.ts)_

## `fluence run`

Run aqua script

```
USAGE
  $ fluence run [--relay <value>] [--data <value>] [--data-path <value>] [--import <value>] [--plugin
    <value>] [--const <value>] [--json-service <value>] [--on <value>] [-i <value>] [-f <value>] [--timeout <value>]
    [--no-input] [-k <value>]

FLAGS
  -f, --func=<function-call>  Function call
  -i, --input=<path>          Path to an aqua file or to a directory that contains aqua files
  -k, --key-pair-name=<name>  Key pair name
  --const=<NAME = value>...   Constant that will be used in the aqua code that you run (example of aqua code: SOME_CONST
                              ?= "default_value"). Constant name must be upper cased.
  --data=<json>               JSON in { [argumentName]: argumentValue } format. You can call a function using these
                              argument names
  --data-path=<path>          Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function
                              using these argument names
  --import=<path>...          Path to a directory to import from. May be used several times
  --json-service=<path>...    Path to a file that contains a JSON formatted service
  --no-input                  Don't interactively ask for any input from the user
  --on=<peer_id>              PeerId of a peer where you want to run the function
  --plugin=<path>             [experimental] Path to a directory with JS plugins (Read more:
                              https://fluence.dev/docs/aqua-book/aqua-cli/plugins)
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    Timeout used for command execution

DESCRIPTION
  Run aqua script

EXAMPLES
  $ fluence run
```

_See code: [dist/commands/run.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.0.0/dist/commands/run.ts)_

## `fluence service add [PATH | URL]`

Add service to fluence.yaml

```
USAGE
  $ fluence service add [PATH | URL] [--no-input] [--name <value>]

ARGUMENTS
  PATH | URL  Path to a service or url to .tar.gz archive

FLAGS
  --name=<name>  Override service name (must start with a lowercase letter and contain only letters, numbers, and
                 underscores)
  --no-input     Don't interactively ask for any input from the user

DESCRIPTION
  Add service to fluence.yaml

EXAMPLES
  $ fluence service add
```

## `fluence service new [PATH]`

Create new marine service template

```
USAGE
  $ fluence service new [PATH] [--no-input] [--name <value>]

ARGUMENTS
  PATH  Path to a service

FLAGS
  --name=<name>  Unique service name (must start with a lowercase letter and contain only letters, numbers, and
                 underscores)
  --no-input     Don't interactively ask for any input from the user

DESCRIPTION
  Create new marine service template

EXAMPLES
  $ fluence service new
```

## `fluence service remove [NAME | PATH | URL]`

Remove service from fluence.yaml

```
USAGE
  $ fluence service remove [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Remove service from fluence.yaml

EXAMPLES
  $ fluence service remove
```

## `fluence service repl [NAME | PATH | URL]`

Open service inside repl (downloads and builds modules if necessary)

```
USAGE
  $ fluence service repl [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Open service inside repl (downloads and builds modules if necessary)

EXAMPLES
  $ fluence service repl
```
<!-- commandsstop -->
