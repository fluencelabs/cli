# Commands
<!-- commands -->
* [`fluence aqua`](#fluence-aqua)
* [`fluence aqua json [FUNC] [INPUT] [OUTPUT]`](#fluence-aqua-json-func-input-output)
* [`fluence aqua yml [FUNC] [INPUT] [OUTPUT]`](#fluence-aqua-yml-func-input-output)
* [`fluence autocomplete [SHELL]`](#fluence-autocomplete-shell)
* [`fluence build`](#fluence-build)
* [`fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID]`](#fluence-deal-change-app-deal-address-new-app-cid)
* [`fluence deal create`](#fluence-deal-create)
* [`fluence deal deploy [WORKER-NAMES]`](#fluence-deal-deploy-worker-names)
* [`fluence default peers [NETWORK]`](#fluence-default-peers-network)
* [`fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-cargo-install-package-name--package-nameversion)
* [`fluence dependency install`](#fluence-dependency-install)
* [`fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dependency-npm-install-package-name--package-nameversion)
* [`fluence dependency versions`](#fluence-dependency-versions)
* [`fluence help [COMMANDS]`](#fluence-help-commands)
* [`fluence init [PATH]`](#fluence-init-path)
* [`fluence key default [NAME]`](#fluence-key-default-name)
* [`fluence key new [NAME]`](#fluence-key-new-name)
* [`fluence key remove [NAME]`](#fluence-key-remove-name)
* [`fluence module add [PATH | URL]`](#fluence-module-add-path--url)
* [`fluence module new [PATH]`](#fluence-module-new-path)
* [`fluence module remove [NAME | PATH | URL]`](#fluence-module-remove-name--path--url)
* [`fluence resource-owner pat create [DEAL-ADDRESS]`](#fluence-resource-owner-pat-create-deal-address)
* [`fluence run`](#fluence-run)
* [`fluence service add [PATH | URL]`](#fluence-service-add-path--url)
* [`fluence service new [PATH]`](#fluence-service-new-path)
* [`fluence service remove [NAME | PATH | URL]`](#fluence-service-remove-name--path--url)
* [`fluence service repl [NAME | PATH | URL]`](#fluence-service-repl-name--path--url)
* [`fluence workers deploy [WORKER-NAMES]`](#fluence-workers-deploy-worker-names)
* [`fluence workers logs [WORKER-NAMES]`](#fluence-workers-logs-worker-names)
* [`fluence workers upload [WORKER-NAMES]`](#fluence-workers-upload-worker-names)

## `fluence aqua`

Compile aqua file or directory that contains your .aqua files

```
USAGE
  $ fluence aqua [-i <value>] [-o <value>] [--import <value>] [--air | --js | --common-js]
    [--old-fluence-js] [--log-level-compiler <value>] [--const <value>] [--no-relay] [--no-xor] [--dry] [--scheduled]
    [-w] [--no-input]

FLAGS
  -i, --input=<path>            Path to an aqua file or an input directory that contains your .aqua files
  -o, --output=<path>           Path to the output directory. Will be created if it doesn't exists
  -w, --watch                   Watch aqua file or folder for changes and recompile
  --air                         Generate .air file instead of .ts
  --common-js                   Use no extension in generated .ts file
  --const=<NAME=value>...       Constants to be passed to the compiler
  --dry                         Checks if compilation is succeeded, without output
  --import=<path>...            Path to a directory to import from. May be used several times
  --js                          Generate .js file instead of .ts
  --log-level-compiler=<level>  Set log level for the compiler. Must be one of: Must be one of: all, trace, debug, info,
                                warn, error, off
  --no-input                    Don't interactively ask for any input from the user
  --no-relay                    Do not generate a pass through the relay node
  --no-xor                      Do not generate a wrapper that catches and displays errors
  --old-fluence-js              Generate TypeScript or JavaScript files for new JS Client
  --scheduled                   Generate air code for script storage. Without error handling wrappers and hops on relay.
                                Will ignore other options

DESCRIPTION
  Compile aqua file or directory that contains your .aqua files

EXAMPLES
  $ fluence aqua
```

_See code: [dist/commands/aqua.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.46/dist/commands/aqua.ts)_

## `fluence aqua json [FUNC] [INPUT] [OUTPUT]`

Generate aqua data structure from json

```
USAGE
  $ fluence aqua json [FUNC] [INPUT] [OUTPUT] [--no-input]

ARGUMENTS
  FUNC    Name of the exported function
  INPUT   Path to json file
  OUTPUT  Path to for output file

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Generate aqua data structure from json
```

## `fluence aqua yml [FUNC] [INPUT] [OUTPUT]`

Generate aqua data structure from yaml

```
USAGE
  $ fluence aqua yml [FUNC] [INPUT] [OUTPUT] [--no-input]

ARGUMENTS
  FUNC    Name of the exported function
  INPUT   Path to yaml file
  OUTPUT  Path to for output file

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Generate aqua data structure from yaml

ALIASES
  $ fluence aqua yaml
```

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v1.4.6/src/commands/autocomplete/index.ts)_

## `fluence build`

Build all application services, described in fluence.yaml

```
USAGE
  $ fluence build [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Build all application services, described in fluence.yaml

EXAMPLES
  $ fluence build
```

_See code: [dist/commands/build.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.46/dist/commands/build.ts)_

## `fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID]`

Change app id in the deal

```
USAGE
  $ fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID] [--no-input] [-k <value>] [--network <value>]

ARGUMENTS
  DEAL-ADDRESS  Deal address
  NEW-APP-CID   New app CID for the deal

FLAGS
  -k, --privKey=<value>  !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --network=<network>    [default: testnet] $The network in which the transactions used by the command will be carried
                         out (local, testnet)
  --no-input             Don't interactively ask for any input from the user

DESCRIPTION
  Change app id in the deal
```

## `fluence deal create`

Create your deal with the specified parameters

```
USAGE
  $ fluence deal create --appCID <value> [--no-input] [--minWorkers <value>] [--targetWorkers <value>] [--network
    <value>] [-k <value>]

FLAGS
  -k, --privKey=<value>    !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --appCID=<value>         (required) CID of the application that will be deployed
  --minWorkers=<value>     [default: 1] Required workers to activate the deal
  --network=<network>      [default: testnet] $The network in which the transactions used by the command will be carried
                           out (local, testnet)
  --no-input               Don't interactively ask for any input from the user
  --targetWorkers=<value>  [default: 3] Max workers in the deal

DESCRIPTION
  Create your deal with the specified parameters
```

## `fluence deal deploy [WORKER-NAMES]`

Deploy workers according to deal in 'deals' property in fluence.yaml

```
USAGE
  $ fluence deal deploy [WORKER-NAMES] [--no-input] [--relay <value>] [--timeout <value>] [--ttl <value>] [-k
    <value>] [--off-aqua-logs] [-k <value>] [--network <value>]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all deals from 'deals' property in fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  -k, --privKey=<value>       !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --network=<network>         [default: testnet] $The network in which the transactions used by the command will be
                              carried out (local, testnet)
  --no-input                  Don't interactively ask for any input from the user
  --off-aqua-logs             Prints Aqua logs
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    [default: 60000] Timeout used for command execution
  --ttl=<milliseconds>        Sets the default TTL for all particles originating from the peer with no TTL specified. If
                              the originating particle's TTL is defined then that value will be used If the option is
                              not set default TTL will be 60000

DESCRIPTION
  Deploy workers according to deal in 'deals' property in fluence.yaml

EXAMPLES
  $ fluence deal deploy
```

## `fluence default peers [NETWORK]`

Print default Fluence network peer addresses

```
USAGE
  $ fluence default peers [NETWORK] [--no-input]

ARGUMENTS
  NETWORK  Network to use. One of kras, stage, testnet

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Print default Fluence network peer addresses

EXAMPLES
  $ fluence default peers
```

## `fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

```
USAGE
  $ fluence dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: marine@0.12.4

FLAGS
  --force                       Force install even if the dependency/dependencies is/are already installed
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name (such as stable or nightly-2022-09-15-x86_64)

DESCRIPTION
  Install cargo project dependencies (all dependencies are cached inside .fluence/cargo directory of the current user)

ALIASES
  $ fluence dependency cargo i
  $ fluence dep cargo i

EXAMPLES
  $ fluence dependency cargo install
```

## `fluence dependency install`

Install all project dependencies (dependencies are cached inside .fluence directory of the current user)

```
USAGE
  $ fluence dependency install [--no-input] [--recommended | --latest] [--force]

FLAGS
  --force        Force install even if the dependency/dependencies is/are already installed
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

## `fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

```
USAGE
  $ fluence dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--force]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs the latest version of the package by default. If you want
                                       to install a specific version, you can do so by appending @ and the version to
                                       the package name. For example: @fluencelabs/aqua-lib@0.6.0

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install npm project dependencies (all dependencies are cached inside .fluence/npm directory of the current user)

ALIASES
  $ fluence dependency npm i
  $ fluence dep npm i

EXAMPLES
  $ fluence dependency npm install
```

## `fluence dependency versions`

Get versions of all currently used dependencies

```
USAGE
  $ fluence dependency versions [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Get versions of all currently used dependencies

ALIASES
  $ fluence dependency v
  $ fluence dep v

EXAMPLES
  $ fluence dependency versions
```

## `fluence help [COMMANDS]`

Display help for fluence.

```
USAGE
  $ fluence help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fluence.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.4/src/commands/help.ts)_

## `fluence init [PATH]`

Initialize fluence project

```
USAGE
  $ fluence init [PATH] [--no-input] [-t <value>]

ARGUMENTS
  PATH  Project path

FLAGS
  -t, --template=<value>  Template to use for the project. One of: minimal, ts, js
  --no-input              Don't interactively ask for any input from the user

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ fluence init
```

_See code: [dist/commands/init.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.46/dist/commands/init.ts)_

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

Generate key-pair and store it in user-secrets.yaml or project-secrets.yaml

```
USAGE
  $ fluence key new [NAME] [--no-input] [--user] [--default]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --default   Set new key-pair as default for current project or user
  --no-input  Don't interactively ask for any input from the user
  --user      Generate key-pair for current user instead of generating key-pair for current project

DESCRIPTION
  Generate key-pair and store it in user-secrets.yaml or project-secrets.yaml

EXAMPLES
  $ fluence key new
```

## `fluence key remove [NAME]`

Remove key-pair from user-secrets.yaml or project-secrets.yaml

```
USAGE
  $ fluence key remove [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Remove key-pair from current user instead of removing key-pair from current project

DESCRIPTION
  Remove key-pair from user-secrets.yaml or project-secrets.yaml

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

## `fluence resource-owner pat create [DEAL-ADDRESS]`

Create provider access token for the deal

```
USAGE
  $ fluence resource-owner pat create [DEAL-ADDRESS] [--no-input] [-k <value>] [--network <value>]

ARGUMENTS
  DEAL-ADDRESS  Deal address

FLAGS
  -k, --privKey=<value>  !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --network=<network>    [default: testnet] $The network in which the transactions used by the command will be carried
                         out (local, testnet)
  --no-input             Don't interactively ask for any input from the user

DESCRIPTION
  Create provider access token for the deal
```

## `fluence run`

Run aqua script

```
USAGE
  $ fluence run [--no-input] [--relay <value>] [--data <value>] [--data-path <value>] [--import <value>]
    [--log-level-compiler <value>] [--log-level-avm <value>] [--print-particle-id] [--quiet] [--plugin <value>] [--const
    <value>] [--json-service <value>] [-i <value>] [-f <value>] [--no-xor] [--no-relay] [--print-air] [--off-aqua-logs]
    [--timeout <value>] [-k <value>]

FLAGS
  -f, --func=<function-call>    Function call
  -i, --input=<path>            Path to an aqua file or to a directory that contains aqua files
  -k, --key-pair-name=<name>    Key pair name
  --const=<NAME = value>...     Constant that will be used in the aqua code that you run (example of aqua code:
                                SOME_CONST ?= "default_value"). Constant name must be upper cased.
  --data=<json>                 JSON in { [argumentName]: argumentValue } format. You can call a function using these
                                argument names
  --data-path=<path>            Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function
                                using these argument names
  --import=<path>...            Path to a directory to import from. May be used several times
  --json-service=<path>...      Path to a file that contains a JSON formatted service
  --log-level-avm=<level>       Set log level for AquaVM. Must be one of: debug, info, warn, error, off, trace
  --log-level-compiler=<level>  Set log level for the compiler. Must be one of: Must be one of: all, trace, debug, info,
                                warn, error, off
  --no-input                    Don't interactively ask for any input from the user
  --no-relay                    Do not generate a pass through the relay node
  --no-xor                      Do not generate a wrapper that catches and displays errors
  --off-aqua-logs               Prints Aqua logs
  --plugin=<path>               [experimental] Path to a directory with JS plugins (Read more:
                                https://fluence.dev/docs/aqua-book/aqua-cli/plugins)
  --print-air                   Prints generated AIR code before function execution
  --print-particle-id           If set, newly initiated particle ids will be printed to console. Useful to see what
                                particle id is responsible for aqua function
  --quiet                       Print only execution result. Overrides all --log-level-* flags
  --relay=<multiaddr>           Relay node multiaddr
  --timeout=<milliseconds>      [default: 60000] Timeout used for command execution

DESCRIPTION
  Run aqua script

EXAMPLES
  $ fluence run
```

_See code: [dist/commands/run.ts](https://github.com/fluencelabs/fluence-cli/blob/v0.2.46/dist/commands/run.ts)_

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

## `fluence workers deploy [WORKER-NAMES]`

Deploy workers to hosts, described in 'hosts' property in fluence.yaml

```
USAGE
  $ fluence workers deploy [WORKER-NAMES] [--no-input] [--relay <value>] [--timeout <value>] [--ttl <value>] [-k
    <value>] [--off-aqua-logs] [-k <value>]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all workers from 'hosts' property in fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  -k, --privKey=<value>       !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --no-input                  Don't interactively ask for any input from the user
  --off-aqua-logs             Prints Aqua logs
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    [default: 60000] Timeout used for command execution
  --ttl=<milliseconds>        Sets the default TTL for all particles originating from the peer with no TTL specified. If
                              the originating particle's TTL is defined then that value will be used If the option is
                              not set default TTL will be 60000

DESCRIPTION
  Deploy workers to hosts, described in 'hosts' property in fluence.yaml

EXAMPLES
  $ fluence workers deploy
```

## `fluence workers logs [WORKER-NAMES]`

Deploy workers according to deal in 'deals' property of fluence.yaml

```
USAGE
  $ fluence workers logs [WORKER-NAMES] [--no-input] [--relay <value>] [--timeout <value>] [--ttl <value>] [-k
    <value>] [--off-aqua-logs] [-k <value>] [--network <value>]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all deals from 'deals' property of fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  -k, --privKey=<value>       !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --network=<network>         [default: testnet] $The network in which the transactions used by the command will be
                              carried out (local, testnet)
  --no-input                  Don't interactively ask for any input from the user
  --off-aqua-logs             Prints Aqua logs
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    [default: 60000] Timeout used for command execution
  --ttl=<milliseconds>        Sets the default TTL for all particles originating from the peer with no TTL specified. If
                              the originating particle's TTL is defined then that value will be used If the option is
                              not set default TTL will be 60000

DESCRIPTION
  Deploy workers according to deal in 'deals' property of fluence.yaml

EXAMPLES
  $ fluence workers logs
```

## `fluence workers upload [WORKER-NAMES]`

Upload workers to hosts, described in 'hosts' property in fluence.yaml

```
USAGE
  $ fluence workers upload [WORKER-NAMES] [--no-input] [--relay <value>] [--timeout <value>] [--ttl <value>] [-k
    <value>] [--off-aqua-logs] [-k <value>]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all workers from 'hosts' property in fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>  Key pair name
  -k, --privKey=<value>       !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --no-input                  Don't interactively ask for any input from the user
  --off-aqua-logs             Prints Aqua logs
  --relay=<multiaddr>         Relay node multiaddr
  --timeout=<milliseconds>    [default: 60000] Timeout used for command execution
  --ttl=<milliseconds>        Sets the default TTL for all particles originating from the peer with no TTL specified. If
                              the originating particle's TTL is defined then that value will be used If the option is
                              not set default TTL will be 60000

DESCRIPTION
  Upload workers to hosts, described in 'hosts' property in fluence.yaml

EXAMPLES
  $ fluence workers upload
```
<!-- commandsstop -->
