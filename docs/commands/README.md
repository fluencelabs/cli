# Commands
<!-- commands -->
* [`Fluence CLI air beautify [PATH]`](#Fluence CLI-air-beautify-path)
* [`Fluence CLI aqua`](#Fluence CLI-aqua)
* [`Fluence CLI aqua json [FUNC] [INPUT] [OUTPUT]`](#Fluence CLI-aqua-json-func-input-output)
* [`Fluence CLI aqua yml [FUNC] [INPUT] [OUTPUT]`](#Fluence CLI-aqua-yml-func-input-output)
* [`Fluence CLI autocomplete [SHELL]`](#Fluence CLI-autocomplete-shell)
* [`Fluence CLI build`](#Fluence CLI-build)
* [`Fluence CLI deal deploy [WORKER-NAMES]`](#Fluence CLI-deal-deploy-worker-names)
* [`Fluence CLI deal logs [WORKER-NAMES]`](#Fluence CLI-deal-logs-worker-names)
* [`Fluence CLI default peers [NETWORK]`](#Fluence CLI-default-peers-network)
* [`Fluence CLI dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#Fluence CLI-dependency-cargo-install-package-name--package-nameversion)
* [`Fluence CLI dependency install`](#Fluence CLI-dependency-install)
* [`Fluence CLI dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#Fluence CLI-dependency-npm-install-package-name--package-nameversion)
* [`Fluence CLI dependency reset`](#Fluence CLI-dependency-reset)
* [`Fluence CLI dependency versions`](#Fluence CLI-dependency-versions)
* [`Fluence CLI help [COMMANDS]`](#Fluence CLI-help-commands)
* [`Fluence CLI init [PATH]`](#Fluence CLI-init-path)
* [`Fluence CLI key default [NAME]`](#Fluence CLI-key-default-name)
* [`Fluence CLI key new [NAME]`](#Fluence CLI-key-new-name)
* [`Fluence CLI key remove [NAME]`](#Fluence CLI-key-remove-name)
* [`Fluence CLI module add [PATH | URL]`](#Fluence CLI-module-add-path--url)
* [`Fluence CLI module new [NAME]`](#Fluence CLI-module-new-name)
* [`Fluence CLI module remove [NAME | PATH | URL]`](#Fluence CLI-module-remove-name--path--url)
* [`Fluence CLI resource-owner pat create [DEAL-ADDRESS]`](#Fluence CLI-resource-owner-pat-create-deal-address)
* [`Fluence CLI run`](#Fluence CLI-run)
* [`Fluence CLI service add [PATH | URL]`](#Fluence CLI-service-add-path--url)
* [`Fluence CLI service new [NAME]`](#Fluence CLI-service-new-name)
* [`Fluence CLI service remove [NAME | PATH | URL]`](#Fluence CLI-service-remove-name--path--url)
* [`Fluence CLI service repl [NAME | PATH | URL]`](#Fluence CLI-service-repl-name--path--url)
* [`Fluence CLI spell new [NAME]`](#Fluence CLI-spell-new-name)
* [`Fluence CLI workers deploy [WORKER-NAMES]`](#Fluence CLI-workers-deploy-worker-names)
* [`Fluence CLI workers logs [WORKER-NAMES]`](#Fluence CLI-workers-logs-worker-names)
* [`Fluence CLI workers upload [WORKER-NAMES]`](#Fluence CLI-workers-upload-worker-names)

## `Fluence CLI air beautify [PATH]`

Prints AIR script in human-readable Python-like representation. This representation cannot be executed and is intended to be read by mere mortals.

```
USAGE
  $ Fluence CLI air beautify [PATH] [--no-input]

ARGUMENTS
  PATH  Path to an AIR file. Must be relative to the current working directory or absolute

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Prints AIR script in human-readable Python-like representation. This representation cannot be executed and is intended
  to be read by mere mortals.

ALIASES
  $ Fluence CLI air b
```

## `Fluence CLI aqua`

Compile aqua file or directory that contains your .aqua files

```
USAGE
  $ Fluence CLI aqua [-w] [--common-js] [--no-input] [-i <value>] [-o <value>] [--import <value>] [--air | --js]
    [--log-level-compiler <value>] [--const <value>] [--no-relay] [--no-xor] [--dry] [--tracing]

FLAGS
  -i, --input=<path>            Path to an aqua file or an input directory that contains your .aqua files. Must be
                                relative to the current working directory or absolute
  -o, --output=<path>           Path to the output directory. Must be relative to the current working directory or
                                absolute. Will be created if it doesn't exists
  -w, --watch                   Watch aqua file or folder for changes and recompile
  --air                         Generate .air file instead of .ts
  --common-js                   Use no extension in generated .ts file imports
  --const=<NAME=value>...       Constants to be passed to the compiler
  --dry                         Checks if compilation is succeeded, without output
  --import=<path>...            Path to a directory to import aqua files from. May be used several times
  --js                          Generate .js file instead of .ts
  --log-level-compiler=<level>  Set log level for the compiler. Must be one of: Must be one of: all, trace, debug, info,
                                warn, error, off
  --no-input                    Don't interactively ask for any input from the user
  --no-relay                    Do not generate a pass through the relay node
  --no-xor                      Do not generate a wrapper that catches and displays errors
  --tracing                     Compile aqua in tracing mode (for debugging purposes)

DESCRIPTION
  Compile aqua file or directory that contains your .aqua files

EXAMPLES
  $ Fluence CLI aqua
```

_See code: [dist/commands/aqua.ts](https://github.com/fluencelabs/Fluence CLI/blob/v0.5.3/dist/commands/aqua.ts)_

## `Fluence CLI aqua json [FUNC] [INPUT] [OUTPUT]`

Infers aqua types for an arbitrary json file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the json file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into

```
USAGE
  $ Fluence CLI aqua json [FUNC] [INPUT] [OUTPUT] [--no-input] [--f64]

ARGUMENTS
  FUNC    Name of the exported function
  INPUT   Path to json file
  OUTPUT  Path to for output file

FLAGS
  --f64       Convert all numbers to f64. Useful for arrays objects that contain numbers of different types in them.
              Without this flag, numbers will be converted to u64, i64 or f64 depending on their value
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Infers aqua types for an arbitrary json file, generates valid aqua code with a function call that returns an aqua
  object literal with the same structure as the json file. For valid generation please refer to aqua documentation
  https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and
  what they translate into
```

## `Fluence CLI aqua yml [FUNC] [INPUT] [OUTPUT]`

Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into

```
USAGE
  $ Fluence CLI aqua yml [FUNC] [INPUT] [OUTPUT] [--no-input] [--f64]

ARGUMENTS
  FUNC    Name of the exported function
  INPUT   Path to yaml file
  OUTPUT  Path to for output file

FLAGS
  --f64       Convert all numbers to f64. Useful for arrays objects that contain numbers of different types in them.
              Without this flag, numbers will be converted to u64, i64 or f64 depending on their value
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua
  object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation
  https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and
  what they translate into

ALIASES
  $ Fluence CLI aqua yaml
```

## `Fluence CLI autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ Fluence CLI autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ Fluence CLI autocomplete

  $ Fluence CLI autocomplete bash

  $ Fluence CLI autocomplete zsh

  $ Fluence CLI autocomplete powershell

  $ Fluence CLI autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v2.3.1/src/commands/autocomplete/index.ts)_

## `Fluence CLI build`

Build all application services, described in fluence.yaml and generate aqua interfaces for them

```
USAGE
  $ Fluence CLI build [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Build all application services, described in fluence.yaml and generate aqua interfaces for them

EXAMPLES
  $ Fluence CLI build
```

_See code: [dist/commands/build.ts](https://github.com/fluencelabs/Fluence CLI/blob/v0.5.3/dist/commands/build.ts)_

## `Fluence CLI deal deploy [WORKER-NAMES]`

Deploy workers according to deal in 'deals' property in fluence.yaml

```
USAGE
  $ Fluence CLI deal deploy [WORKER-NAMES] [--no-input] [-k <value>] [--off-aqua-logs] [--privKey <value>] [--network
    <value>] [--relay <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--import <value>] [--no-build]
    [--tracing]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all deals from 'deals' property in fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>     Key pair name
  --dial-timeout=<milliseconds>  [default: 60000] Timeout for Fluence js-client to connect to relay peer
  --import=<path>...             Path to a directory to import aqua files from. May be used several times
  --network=<network>            [default: testnet] The network in which the transactions used by the command will be
                                 carried out (local, testnet)
  --no-build                     Don't build the project before running the command
  --no-input                     Don't interactively ask for any input from the user
  --off-aqua-logs                Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                  Print particle ids when running Fluence js-client
  --privKey=<value>              !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --relay=<multiaddress>         Relay for Fluence js-client to connect to
  --tracing                      Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>           [default: 120000] Particle Time To Live since 'now'. After that, particle is expired
                                 and not processed.

DESCRIPTION
  Deploy workers according to deal in 'deals' property in fluence.yaml

EXAMPLES
  $ Fluence CLI deal deploy
```

## `Fluence CLI deal logs [WORKER-NAMES]`

Get logs from deployed workers for deals listed in workers.yaml

```
USAGE
  $ Fluence CLI deal logs [WORKER-NAMES] [--no-input] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [-k <value>] [--off-aqua-logs] [--privKey <value>] [--tracing]

ARGUMENTS
  WORKER-NAMES  Worker names to get logs for (by default all worker names from 'deals' property of workers.yaml)

FLAGS
  -k, --key-pair-name=<name>     Key pair name
  --dial-timeout=<milliseconds>  [default: 60000] Timeout for Fluence js-client to connect to relay peer
  --no-input                     Don't interactively ask for any input from the user
  --off-aqua-logs                Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                  Print particle ids when running Fluence js-client
  --privKey=<value>              !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --relay=<multiaddress>         Relay for Fluence js-client to connect to
  --tracing                      Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>           [default: 120000] Particle Time To Live since 'now'. After that, particle is expired
                                 and not processed.

DESCRIPTION
  Get logs from deployed workers for deals listed in workers.yaml

EXAMPLES
  $ Fluence CLI deal logs
```

## `Fluence CLI default peers [NETWORK]`

Print default Fluence network peer addresses

```
USAGE
  $ Fluence CLI default peers [NETWORK] [--no-input]

ARGUMENTS
  NETWORK  Network to use. One of kras, stage, testnet

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Print default Fluence network peer addresses

EXAMPLES
  $ Fluence CLI default peers
```

## `Fluence CLI dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

(For advanced users) Install cargo project dependencies (all dependencies are cached inside user's .fluence/cargo directory)

```
USAGE
  $ Fluence CLI dependency cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>] [--force]
  [--global]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs a first version it can find in the following list:
                                       fluence.yaml, user's .fluence/config.yaml, dependency versions recommended by
                                       fluence, latest version cargo is aware of. If you want to install a specific
                                       version, you can do so by appending @ and the version to the package name. For
                                       example: marine@0.12.4

FLAGS
  --force                       Force install even if the dependency/dependencies is/are already installed
  --global                      Will override dependencies in a global user's config.yaml instead of project's
                                fluence.yaml
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rustup toolchain name

DESCRIPTION
  (For advanced users) Install cargo project dependencies (all dependencies are cached inside user's .fluence/cargo
  directory)

ALIASES
  $ Fluence CLI dependency cargo i
  $ Fluence CLI dep cargo i

EXAMPLES
  $ Fluence CLI dependency cargo install
```

## `Fluence CLI dependency install`

Install all project dependencies (dependencies are cached inside user's .fluence directory)

```
USAGE
  $ Fluence CLI dependency install [--no-input] [--force]

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install all project dependencies (dependencies are cached inside user's .fluence directory)

ALIASES
  $ Fluence CLI dependency i
  $ Fluence CLI dep i

EXAMPLES
  $ Fluence CLI dependency install
```

## `Fluence CLI dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

(For advanced users) Install npm project dependencies (all dependencies are cached inside user's .fluence/npm directory)

```
USAGE
  $ Fluence CLI dependency npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--force] [--global]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs a first version it can find in the following list:
                                       fluence.yaml, , user's .fluence/config.yaml, dependency versions recommended by
                                       fluence, latest version cargo is aware of. If you want to install a specific
                                       version, you can do so by appending @ and the version to the package name. For
                                       example: @fluencelabs/aqua-lib@0.6.0

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --global    Will override dependencies in a global user's config.yaml instead of project's fluence.yaml
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  (For advanced users) Install npm project dependencies (all dependencies are cached inside user's .fluence/npm
  directory)

ALIASES
  $ Fluence CLI dependency npm i
  $ Fluence CLI dep npm i

EXAMPLES
  $ Fluence CLI dependency npm install
```

## `Fluence CLI dependency reset`

Reset all project dependencies to recommended versions for the current Fluence CLI version

```
USAGE
  $ Fluence CLI dependency reset [--no-input] [--global] [--all]

FLAGS
  --all       Remove all dependencies, not only recommended ones
  --global    Will override dependencies in a global user's config.yaml instead of project's fluence.yaml
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Reset all project dependencies to recommended versions for the current Fluence CLI version

ALIASES
  $ Fluence CLI dependency r
  $ Fluence CLI dep r

EXAMPLES
  $ Fluence CLI dependency reset
```

## `Fluence CLI dependency versions`

Get versions of all dependencies

```
USAGE
  $ Fluence CLI dependency versions [--no-input] [--default]

FLAGS
  --default   Display default npm and cargo dependencies and their versions for current CLI version. Default npm
              dependencies are always available to be imported in Aqua
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Get versions of all dependencies

ALIASES
  $ Fluence CLI dependency v
  $ Fluence CLI dep v
  $ Fluence CLI dep versions

EXAMPLES
  $ Fluence CLI dependency versions
```

## `Fluence CLI help [COMMANDS]`

Display help for Fluence CLI.

```
USAGE
  $ Fluence CLI help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for Fluence CLI.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.11/src/commands/help.ts)_

## `Fluence CLI init [PATH]`

Initialize fluence project

```
USAGE
  $ Fluence CLI init [PATH] [--no-input] [-t <value>]

ARGUMENTS
  PATH  Project path

FLAGS
  -t, --template=<value>  Template to use for the project. One of: quickstart, minimal, ts, js
  --no-input              Don't interactively ask for any input from the user

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ Fluence CLI init
```

_See code: [dist/commands/init.ts](https://github.com/fluencelabs/Fluence CLI/blob/v0.5.3/dist/commands/init.ts)_

## `Fluence CLI key default [NAME]`

Set default key-pair for user or project

```
USAGE
  $ Fluence CLI key default [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Set default key-pair for current user instead of current project

DESCRIPTION
  Set default key-pair for user or project

EXAMPLES
  $ Fluence CLI key default
```

## `Fluence CLI key new [NAME]`

Generate key-pair and store it in user-secrets.yaml or project-secrets.yaml

```
USAGE
  $ Fluence CLI key new [NAME] [--no-input] [--user] [--default]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --default   Set new key-pair as default for current project or user
  --no-input  Don't interactively ask for any input from the user
  --user      Generate key-pair for current user instead of generating key-pair for current project

DESCRIPTION
  Generate key-pair and store it in user-secrets.yaml or project-secrets.yaml

EXAMPLES
  $ Fluence CLI key new
```

## `Fluence CLI key remove [NAME]`

Remove key-pair from user-secrets.yaml or project-secrets.yaml

```
USAGE
  $ Fluence CLI key remove [NAME] [--no-input] [--user]

ARGUMENTS
  NAME  Key-pair name

FLAGS
  --no-input  Don't interactively ask for any input from the user
  --user      Remove key-pair from current user instead of removing key-pair from current project

DESCRIPTION
  Remove key-pair from user-secrets.yaml or project-secrets.yaml

EXAMPLES
  $ Fluence CLI key remove
```

## `Fluence CLI module add [PATH | URL]`

Add module to service.yaml

```
USAGE
  $ Fluence CLI module add [PATH | URL] [--no-input] [--name <value>] [--service <value>]

ARGUMENTS
  PATH | URL  Path to a module or url to .tar.gz archive

FLAGS
  --name=<name>            Override module name
  --no-input               Don't interactively ask for any input from the user
  --service=<name | path>  Service name from fluence.yaml or path to the service config or directory that contains
                           service.yaml

DESCRIPTION
  Add module to service.yaml

EXAMPLES
  $ Fluence CLI module add
```

## `Fluence CLI module new [NAME]`

Create new marine module template

```
USAGE
  $ Fluence CLI module new [NAME] [--no-input] [--path <value>]

ARGUMENTS
  NAME  Module name

FLAGS
  --no-input     Don't interactively ask for any input from the user
  --path=<path>  Path to module dir (default: src/modules)

DESCRIPTION
  Create new marine module template

EXAMPLES
  $ Fluence CLI module new
```

## `Fluence CLI module remove [NAME | PATH | URL]`

Remove module from service.yaml

```
USAGE
  $ Fluence CLI module remove [NAME | PATH | URL] [--no-input] [--service <value>]

ARGUMENTS
  NAME | PATH | URL  Module name from service.yaml, path to a module or url to .tar.gz archive

FLAGS
  --no-input               Don't interactively ask for any input from the user
  --service=<name | path>  Service name from fluence.yaml or path to the service directory

DESCRIPTION
  Remove module from service.yaml

EXAMPLES
  $ Fluence CLI module remove
```

## `Fluence CLI resource-owner pat create [DEAL-ADDRESS]`

Create provider access token for the deal

```
USAGE
  $ Fluence CLI resource-owner pat create [DEAL-ADDRESS] [--no-input] [--privKey <value>] [--network <value>]

ARGUMENTS
  DEAL-ADDRESS  Deal address

FLAGS
  --network=<network>  [default: testnet] The network in which the transactions used by the command will be carried out
                       (local, testnet)
  --no-input           Don't interactively ask for any input from the user
  --privKey=<value>    !WARNING! for debug purposes only. Passing private keys through flags is unsecure

DESCRIPTION
  Create provider access token for the deal
```

## `Fluence CLI run`

Run aqua script

```
USAGE
  $ Fluence CLI run [--no-input] [--data <value>] [--data-path <value>] [--import <value>] [--log-level-compiler
    <value>] [--quiet] [--const <value>] [-i <value>] [-f <value>] [--no-xor] [--no-relay] [--print-air | -b]
    [--off-aqua-logs] [-k <value>] [--relay <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id]
    [--tracing]

FLAGS
  -b, --print-beautified-air     Prints beautified AIR code before function execution
  -f, --func=<function-call>     Function call. Example: funcName("stringArg")
  -i, --input=<path>             Path to an aqua file or to a directory that contains aqua files
  -k, --key-pair-name=<name>     Key pair name
  --const=<NAME = value>...      Constant that will be used in the aqua code that you run (example of aqua code:
                                 SOME_CONST ?= "default_value"). Constant name must be upper cased.
  --data=<json>                  JSON in { [argumentName]: argumentValue } format. You can call a function using these
                                 argument names
  --data-path=<path>             Path to a JSON file in { [argumentName]: argumentValue } format. You can call a
                                 function using these argument names
  --dial-timeout=<milliseconds>  [default: 60000] Timeout for Fluence js-client to connect to relay peer
  --import=<path>...             Path to a directory to import aqua files from. May be used several times
  --log-level-compiler=<level>   Set log level for the compiler. Must be one of: Must be one of: all, trace, debug,
                                 info, warn, error, off
  --no-input                     Don't interactively ask for any input from the user
  --no-relay                     Do not generate a pass through the relay node
  --no-xor                       Do not generate a wrapper that catches and displays errors
  --off-aqua-logs                Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                  Print particle ids when running Fluence js-client
  --print-air                    Prints generated AIR code before function execution
  --quiet                        Print only execution result. Overrides all --log-level-* flags
  --relay=<multiaddress>         Relay for Fluence js-client to connect to
  --tracing                      Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>           [default: 120000] Particle Time To Live since 'now'. After that, particle is expired
                                 and not processed.

DESCRIPTION
  Run aqua script

EXAMPLES
  $ Fluence CLI run
```

_See code: [dist/commands/run.ts](https://github.com/fluencelabs/Fluence CLI/blob/v0.5.3/dist/commands/run.ts)_

## `Fluence CLI service add [PATH | URL]`

Add service to fluence.yaml

```
USAGE
  $ Fluence CLI service add [PATH | URL] [--no-input] [--name <value>]

ARGUMENTS
  PATH | URL  Path to a service or url to .tar.gz archive

FLAGS
  --name=<name>  Override service name (must start with a lowercase letter and contain only letters, numbers, and
                 underscores)
  --no-input     Don't interactively ask for any input from the user

DESCRIPTION
  Add service to fluence.yaml

EXAMPLES
  $ Fluence CLI service add
```

## `Fluence CLI service new [NAME]`

Create new marine service template

```
USAGE
  $ Fluence CLI service new [NAME] [--no-input] [--path <value>]

ARGUMENTS
  NAME  Unique service name (must start with a lowercase letter and contain only letters, numbers, and underscores)

FLAGS
  --no-input     Don't interactively ask for any input from the user
  --path=<path>  Path to services dir (default: src/services)

DESCRIPTION
  Create new marine service template

EXAMPLES
  $ Fluence CLI service new
```

## `Fluence CLI service remove [NAME | PATH | URL]`

Remove service from fluence.yaml services property and from all of the workers

```
USAGE
  $ Fluence CLI service remove [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Remove service from fluence.yaml services property and from all of the workers

EXAMPLES
  $ Fluence CLI service remove
```

## `Fluence CLI service repl [NAME | PATH | URL]`

Open service inside repl (downloads and builds modules if necessary)

```
USAGE
  $ Fluence CLI service repl [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Open service inside repl (downloads and builds modules if necessary)

EXAMPLES
  $ Fluence CLI service repl
```

## `Fluence CLI spell new [NAME]`

Create a new spell template

```
USAGE
  $ Fluence CLI spell new [NAME] [--no-input] [--path <value>]

ARGUMENTS
  NAME  Spell name

FLAGS
  --no-input     Don't interactively ask for any input from the user
  --path=<path>  Path to spells dir (default: src/spells)

DESCRIPTION
  Create a new spell template

EXAMPLES
  $ Fluence CLI spell new
```

## `Fluence CLI workers deploy [WORKER-NAMES]`

Deploy workers to hosts, described in 'hosts' property in fluence.yaml

```
USAGE
  $ Fluence CLI workers deploy [WORKER-NAMES] [--no-input] [-k <value>] [--off-aqua-logs] [--privKey <value>] [--relay
    <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--import <value>] [--no-build] [--tracing]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all workers from 'hosts' property in fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>     Key pair name
  --dial-timeout=<milliseconds>  [default: 60000] Timeout for Fluence js-client to connect to relay peer
  --import=<path>...             Path to a directory to import aqua files from. May be used several times
  --no-build                     Don't build the project before running the command
  --no-input                     Don't interactively ask for any input from the user
  --off-aqua-logs                Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                  Print particle ids when running Fluence js-client
  --privKey=<value>              !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --relay=<multiaddress>         Relay for Fluence js-client to connect to
  --tracing                      Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>           [default: 120000] Particle Time To Live since 'now'. After that, particle is expired
                                 and not processed.

DESCRIPTION
  Deploy workers to hosts, described in 'hosts' property in fluence.yaml

EXAMPLES
  $ Fluence CLI workers deploy
```

## `Fluence CLI workers logs [WORKER-NAMES]`

Get logs from deployed workers for hosts listed in workers.yaml

```
USAGE
  $ Fluence CLI workers logs [WORKER-NAMES] [--no-input] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [-k <value>] [--off-aqua-logs] [--privKey <value>] [--worker-id <value>] [--host-id <value>]
    [--spell-id <value>] [--tracing]

ARGUMENTS
  WORKER-NAMES  Worker names to get logs for (by default all worker names from 'hosts' property of workers.yaml)

FLAGS
  -k, --key-pair-name=<name>     Key pair name
  --dial-timeout=<milliseconds>  [default: 60000] Timeout for Fluence js-client to connect to relay peer
  --host-id=<host-id>            Host id
  --no-input                     Don't interactively ask for any input from the user
  --off-aqua-logs                Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                  Print particle ids when running Fluence js-client
  --privKey=<value>              !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --relay=<multiaddress>         Relay for Fluence js-client to connect to
  --spell-id=<spell-id>          [default: worker-spell] Spell id
  --tracing                      Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>           [default: 120000] Particle Time To Live since 'now'. After that, particle is expired
                                 and not processed.
  --worker-id=<worker-id>        Worker id

DESCRIPTION
  Get logs from deployed workers for hosts listed in workers.yaml

EXAMPLES
  $ Fluence CLI workers logs
```

## `Fluence CLI workers upload [WORKER-NAMES]`

Upload workers to hosts, described in 'hosts' property in fluence.yaml

```
USAGE
  $ Fluence CLI workers upload [WORKER-NAMES] [--no-input] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [-k <value>] [--off-aqua-logs] [--privKey <value>] [--import <value>] [--no-build] [--tracing]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all workers from 'hosts' property in fluence.yaml are deployed)

FLAGS
  -k, --key-pair-name=<name>     Key pair name
  --dial-timeout=<milliseconds>  [default: 60000] Timeout for Fluence js-client to connect to relay peer
  --import=<path>...             Path to a directory to import aqua files from. May be used several times
  --no-build                     Don't build the project before running the command
  --no-input                     Don't interactively ask for any input from the user
  --off-aqua-logs                Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                  Print particle ids when running Fluence js-client
  --privKey=<value>              !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --relay=<multiaddress>         Relay for Fluence js-client to connect to
  --tracing                      Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>           [default: 120000] Particle Time To Live since 'now'. After that, particle is expired
                                 and not processed.

DESCRIPTION
  Upload workers to hosts, described in 'hosts' property in fluence.yaml

EXAMPLES
  $ Fluence CLI workers upload
```
<!-- commandsstop -->
