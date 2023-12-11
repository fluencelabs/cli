# Commands
<!-- commands -->
* [`fluence air beautify [PATH]`](#fluence-air-beautify-path)
* [`fluence aqua`](#fluence-aqua)
* [`fluence aqua json [INPUT] [OUTPUT]`](#fluence-aqua-json-input-output)
* [`fluence aqua yml [INPUT] [OUTPUT]`](#fluence-aqua-yml-input-output)
* [`fluence autocomplete [SHELL]`](#fluence-autocomplete-shell)
* [`fluence build`](#fluence-build)
* [`fluence deal deploy [WORKER-NAMES]`](#fluence-deal-deploy-worker-names)
* [`fluence deal info [DEAL-ADDRESS]`](#fluence-deal-info-deal-address)
* [`fluence deal logs [WORKER-NAMES]`](#fluence-deal-logs-worker-names)
* [`fluence default env [ENV]`](#fluence-default-env-env)
* [`fluence default peers [ENV]`](#fluence-default-peers-env)
* [`fluence dep cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-cargo-install-package-name--package-nameversion)
* [`fluence dep install`](#fluence-dep-install)
* [`fluence dep npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-npm-install-package-name--package-nameversion)
* [`fluence dep reset`](#fluence-dep-reset)
* [`fluence dep versions`](#fluence-dep-versions)
* [`fluence help [COMMANDS]`](#fluence-help-commands)
* [`fluence init [PATH]`](#fluence-init-path)
* [`fluence key default [NAME]`](#fluence-key-default-name)
* [`fluence key new [NAME]`](#fluence-key-new-name)
* [`fluence key remove [NAME]`](#fluence-key-remove-name)
* [`fluence local down`](#fluence-local-down)
* [`fluence local init`](#fluence-local-init)
* [`fluence local logs`](#fluence-local-logs)
* [`fluence local ps`](#fluence-local-ps)
* [`fluence local restart`](#fluence-local-restart)
* [`fluence local up`](#fluence-local-up)
* [`fluence module add [PATH | URL]`](#fluence-module-add-path--url)
* [`fluence module new [NAME]`](#fluence-module-new-name)
* [`fluence module remove [NAME | PATH | URL]`](#fluence-module-remove-name--path--url)
* [`fluence provider add-peer`](#fluence-provider-add-peer)
* [`fluence provider add-units`](#fluence-provider-add-units)
* [`fluence provider gen`](#fluence-provider-gen)
* [`fluence provider info`](#fluence-provider-info)
* [`fluence provider init`](#fluence-provider-init)
* [`fluence provider register`](#fluence-provider-register)
* [`fluence provider remove-peer`](#fluence-provider-remove-peer)
* [`fluence provider remove-units`](#fluence-provider-remove-units)
* [`fluence run`](#fluence-run)
* [`fluence service add [PATH | URL]`](#fluence-service-add-path--url)
* [`fluence service new [NAME]`](#fluence-service-new-name)
* [`fluence service remove [NAME | PATH | URL]`](#fluence-service-remove-name--path--url)
* [`fluence service repl [NAME | PATH | URL]`](#fluence-service-repl-name--path--url)
* [`fluence spell build [SPELL-NAMES]`](#fluence-spell-build-spell-names)
* [`fluence spell new [NAME]`](#fluence-spell-new-name)
* [`fluence update [CHANNEL]`](#fluence-update-channel)
* [`fluence workers deploy [WORKER-NAMES]`](#fluence-workers-deploy-worker-names)
* [`fluence workers logs [WORKER-NAMES]`](#fluence-workers-logs-worker-names)
* [`fluence workers remove [WORKER-NAMES]`](#fluence-workers-remove-worker-names)
* [`fluence workers upload [WORKER-NAMES]`](#fluence-workers-upload-worker-names)

## `fluence air beautify [PATH]`

Prints AIR script in human-readable Python-like representation. This representation cannot be executed and is intended to be read by mere mortals.

```
USAGE
  $ fluence air beautify [PATH] [--no-input]

ARGUMENTS
  PATH  Path to an AIR file. Must be relative to the current working directory or absolute

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Prints AIR script in human-readable Python-like representation. This representation cannot be executed and is intended
  to be read by mere mortals.

ALIASES
  $ fluence air b
```

_See code: [src/commands/air/beautify.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/air/beautify.ts)_

## `fluence aqua`

Compile aqua file or directory that contains your .aqua files

```
USAGE
  $ fluence aqua [-w] [--common-js] [--no-input] [-i <value>] [-o <value>] [--import <value>] [--air |
    --js] [--log-level-compiler <value>] [--const <value>] [--no-relay] [--no-xor] [--dry] [--tracing]

FLAGS
  -i, --input=<path>            Path to an aqua file or an input directory that contains your .aqua files. Must be
                                relative to the current working directory or absolute
  -o, --output=<path>           Path to the output directory. Must be relative to the current working directory or
                                absolute. Will be created if it doesn't exists
  -w, --watch                   Watch aqua file or folder for changes and recompile
  --air                         Generate .air file instead of .ts
  --common-js                   Use no extension in generated .ts file imports
  --const=<NAME=value>...       Constants to be passed to the compiler
  --dry                         Checks if compilation succeeded, without output
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
  $ fluence aqua
```

_See code: [src/commands/aqua.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/aqua.ts)_

## `fluence aqua json [INPUT] [OUTPUT]`

Infers aqua types for an arbitrary json file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the json file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into

```
USAGE
  $ fluence aqua json [INPUT] [OUTPUT] [--no-input] [--f64] [--types <value>]

ARGUMENTS
  INPUT   Path to json file
  OUTPUT  Path to the output dir

FLAGS
  --f64           Convert all numbers to f64. Useful for arrays objects that contain numbers of different types in them.
                  Without this flag, numbers will be converted to u64, i64 or f64 depending on their value
  --no-input      Don't interactively ask for any input from the user
  --types=<path>  Experimental! Path to a file with custom types. Must be a list with objects that have 'name' and
                  'properties'. 'properties' must be a list of all custom type properties

DESCRIPTION
  Infers aqua types for an arbitrary json file, generates valid aqua code with a function call that returns an aqua
  object literal with the same structure as the json file. For valid generation please refer to aqua documentation
  https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and
  what they translate into
```

_See code: [src/commands/aqua/json.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/aqua/json.ts)_

## `fluence aqua yml [INPUT] [OUTPUT]`

Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into

```
USAGE
  $ fluence aqua yml [INPUT] [OUTPUT] [--no-input] [--f64] [--types <value>]

ARGUMENTS
  INPUT   Path to yaml file
  OUTPUT  Path to the output dir

FLAGS
  --f64           Convert all numbers to f64. Useful for arrays objects that contain numbers of different types in them.
                  Without this flag, numbers will be converted to u64, i64 or f64 depending on their value
  --no-input      Don't interactively ask for any input from the user
  --types=<path>  Experimental! Path to a file with custom types. Must be a list with objects that have 'name' and
                  'properties'. 'properties' must be a list of all custom type properties

DESCRIPTION
  Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua
  object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation
  https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and
  what they translate into

ALIASES
  $ fluence aqua yaml
```

_See code: [src/commands/aqua/yml.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/aqua/yml.ts)_

## `fluence autocomplete [SHELL]`

display autocomplete installation instructions

```
USAGE
  $ fluence autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  display autocomplete installation instructions

EXAMPLES
  $ fluence autocomplete

  $ fluence autocomplete bash

  $ fluence autocomplete zsh

  $ fluence autocomplete powershell

  $ fluence autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v2.3.10/src/commands/autocomplete/index.ts)_

## `fluence build`

Build all application services, described in fluence.yaml and generate aqua interfaces for them

```
USAGE
  $ fluence build [--no-input] [--marine-build-args <value>] [--import <value>] [--env <value>]

FLAGS
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --import=<path>...                               Path to a directory to import aqua files from. May be used several
                                                   times
  --marine-build-args=<--flag arg>                 Space separated `cargo build` flags and args to pass to marine build.
                                                   Overrides 'marineBuildArgs' property in fluence.yaml. Default:
                                                   --release
  --no-input                                       Don't interactively ask for any input from the user

DESCRIPTION
  Build all application services, described in fluence.yaml and generate aqua interfaces for them

EXAMPLES
  $ fluence build
```

_See code: [src/commands/build.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/build.ts)_

## `fluence deal deploy [WORKER-NAMES]`

Deploy workers according to deal in 'deals' property in fluence.yaml

```
USAGE
  $ fluence deal deploy [WORKER-NAMES] [--no-input] [-k <value>] [--off-aqua-logs] [--priv-key <value>] [--env
    <value>] [--relay <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--import <value>] [--no-build]
    [--tracing] [--marine-build-args <value>] [--auto-match]

ARGUMENTS
  WORKER-NAMES  Comma separated names of workers to deploy. Example: "worker1,worker2" (by default all workers from
                'deals' property in fluence.yaml are deployed)

FLAGS
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --[no-]auto-match                                Toggle automatic matching. Auto-matching is turned on by default
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --import=<path>...                               Path to a directory to import aqua files from. May be used several
                                                   times
  --marine-build-args=<--flag arg>                 Space separated `cargo build` flags and args to pass to marine build.
                                                   Overrides 'marineBuildArgs' property in fluence.yaml. Default:
                                                   --release
  --no-build                                       Don't build the project before running the command
  --no-input                                       Don't interactively ask for any input from the user
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.

DESCRIPTION
  Deploy workers according to deal in 'deals' property in fluence.yaml

EXAMPLES
  $ fluence deal deploy
```

_See code: [src/commands/deal/deploy.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/deal/deploy.ts)_

## `fluence deal info [DEAL-ADDRESS]`

Get info about provider

```
USAGE
  $ fluence deal info [DEAL-ADDRESS] [--no-input] [--env <value>]

ARGUMENTS
  DEAL-ADDRESS  Deal address

FLAGS
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user

DESCRIPTION
  Get info about provider
```

_See code: [src/commands/deal/info.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/deal/info.ts)_

## `fluence deal logs [WORKER-NAMES]`

Get logs from deployed workers for deals listed in workers.yaml

```
USAGE
  $ fluence deal logs [WORKER-NAMES] [--no-input] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [--env <value>] [-k <value>] [--off-aqua-logs] [--priv-key <value>] [--tracing]

ARGUMENTS
  WORKER-NAMES  Worker names to get logs for (by default all worker names from 'deals' property of workers.yaml)

FLAGS
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.

DESCRIPTION
  Get logs from deployed workers for deals listed in workers.yaml

EXAMPLES
  $ fluence deal logs
```

_See code: [src/commands/deal/logs.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/deal/logs.ts)_

## `fluence default env [ENV]`

Switch default Fluence Environment used in the current Fluence project

```
USAGE
  $ fluence default env [ENV] [--no-input]

ARGUMENTS
  ENV  Fluence Environment to use when running the command

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Switch default Fluence Environment used in the current Fluence project

EXAMPLES
  $ fluence default env
```

_See code: [src/commands/default/env.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/default/env.ts)_

## `fluence default peers [ENV]`

Print default Fluence network peer addresses

```
USAGE
  $ fluence default peers [ENV] [--no-input]

ARGUMENTS
  ENV  Fluence Environment to use when running the command

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Print default Fluence network peer addresses

EXAMPLES
  $ fluence default peers
```

_See code: [src/commands/default/peers.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/default/peers.ts)_

## `fluence dep cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

(For advanced users) Install cargo project dependencies (all dependencies are cached inside user's .fluence/cargo directory)

```
USAGE
  $ fluence dep cargo install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--toolchain <value>] [--force] [-g]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs a first version it can find in the following list:
                                       fluence.yaml, user's .fluence/config.yaml, dependency versions recommended by
                                       fluence, latest version cargo is aware of. If you want to install a specific
                                       version, you can do so by appending @ and the version to the package name. For
                                       example: package@version

FLAGS
  -g, --global                  Will override dependencies in a global user's config.yaml instead of project's
                                fluence.yaml
  --force                       Force install even if the dependency/dependencies is/are already installed
  --no-input                    Don't interactively ask for any input from the user
  --toolchain=<toolchain_name>  Rust toolchain name that will be used in case pre-built binary download fails or --force
                                flag is used. Default: nightly-2023-08-27-x86_64"]}

DESCRIPTION
  (For advanced users) Install cargo project dependencies (all dependencies are cached inside user's .fluence/cargo
  directory)

ALIASES
  $ fluence dep cargo i

EXAMPLES
  $ fluence dep cargo install
```

_See code: [src/commands/dep/cargo/install.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/dep/cargo/install.ts)_

## `fluence dep install`

Install all project dependencies (dependencies are cached inside user's .fluence directory)

```
USAGE
  $ fluence dep install [--no-input] [--force]

FLAGS
  --force     Force install even if the dependency/dependencies is/are already installed
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install all project dependencies (dependencies are cached inside user's .fluence directory)

ALIASES
  $ fluence dep i

EXAMPLES
  $ fluence dep install
```

_See code: [src/commands/dep/install.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/dep/install.ts)_

## `fluence dep npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

(For advanced users) Install npm project dependencies (all dependencies are cached inside user's .fluence/npm directory)

```
USAGE
  $ fluence dep npm install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input] [--force] [-g]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Package name. Installs a first version it can find in the following list:
                                       fluence.yaml, user's .fluence/config.yaml, dependency versions recommended by
                                       fluence, latest version npm is aware of. If you want to install a specific
                                       version, you can do so by appending @ and the version to the package name.
                                       Example: package@version

FLAGS
  -g, --global  Will override dependencies in a global user's config.yaml instead of project's fluence.yaml
  --force       Force install even if the dependency/dependencies is/are already installed
  --no-input    Don't interactively ask for any input from the user

DESCRIPTION
  (For advanced users) Install npm project dependencies (all dependencies are cached inside user's .fluence/npm
  directory)

ALIASES
  $ fluence dep npm i

EXAMPLES
  $ fluence dep npm install
```

_See code: [src/commands/dep/npm/install.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/dep/npm/install.ts)_

## `fluence dep reset`

Reset all project dependencies to recommended versions for the current Fluence CLI version

```
USAGE
  $ fluence dep reset [--no-input] [-g] [--all]

FLAGS
  -g, --global  Will override dependencies in a global user's config.yaml instead of project's fluence.yaml
  --all         Remove all dependencies, not only recommended ones
  --no-input    Don't interactively ask for any input from the user

DESCRIPTION
  Reset all project dependencies to recommended versions for the current Fluence CLI version

ALIASES
  $ fluence dep r

EXAMPLES
  $ fluence dep reset
```

_See code: [src/commands/dep/reset.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/dep/reset.ts)_

## `fluence dep versions`

Get versions of all dependencies

```
USAGE
  $ fluence dep versions [--no-input] [--default]

FLAGS
  --default   Display default npm and cargo dependencies and their versions for current CLI version. Default npm
              dependencies are always available to be imported in Aqua
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Get versions of all dependencies

ALIASES
  $ fluence dep v

EXAMPLES
  $ fluence dep versions
```

_See code: [src/commands/dep/versions.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/dep/versions.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.6/src/commands/help.ts)_

## `fluence init [PATH]`

Initialize fluence project

```
USAGE
  $ fluence init [PATH] [--no-input] [-t <value>] [--env <value>] [--noxes <value>]

ARGUMENTS
  PATH  Project path

FLAGS
  -t, --template=<value>                           Template to use for the project. One of: quickstart, minimal, ts, js
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --noxes=<value>                                  Number of Compute Peers to generate when a new provider.yaml is
                                                   created

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ fluence init
```

_See code: [src/commands/init.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/init.ts)_

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

_See code: [src/commands/key/default.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/key/default.ts)_

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

_See code: [src/commands/key/new.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/key/new.ts)_

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

_See code: [src/commands/key/remove.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/key/remove.ts)_

## `fluence local down`

Stop currently running docker-compose.yaml using docker compose

```
USAGE
  $ fluence local down [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Stop currently running docker-compose.yaml using docker compose

EXAMPLES
  $ fluence local down
```

_See code: [src/commands/local/down.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/local/down.ts)_

## `fluence local init`

Init docker-compose.yaml according to provider.yaml

```
USAGE
  $ fluence local init [--no-input] [--noxes <value>]

FLAGS
  --no-input       Don't interactively ask for any input from the user
  --noxes=<value>  Number of Compute Peers to generate when a new provider.yaml is created

DESCRIPTION
  Init docker-compose.yaml according to provider.yaml

EXAMPLES
  $ fluence local init
```

_See code: [src/commands/local/init.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/local/init.ts)_

## `fluence local logs`

Display docker-compose.yaml logs

```
USAGE
  $ fluence local logs [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Display docker-compose.yaml logs

EXAMPLES
  $ fluence local logs
```

_See code: [src/commands/local/logs.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/local/logs.ts)_

## `fluence local ps`

List containers using docker compose

```
USAGE
  $ fluence local ps [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  List containers using docker compose

EXAMPLES
  $ fluence local ps
```

_See code: [src/commands/local/ps.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/local/ps.ts)_

## `fluence local restart`

Restart docker-compose.yaml using docker compose

```
USAGE
  $ fluence local restart [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Restart docker-compose.yaml using docker compose

EXAMPLES
  $ fluence local restart
```

_See code: [src/commands/local/restart.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/local/restart.ts)_

## `fluence local up`

Run docker-compose.yaml using docker compose

```
USAGE
  $ fluence local up [--no-input] [--noxes <value>] [--timeout <value>] [--priv-key <value>]

FLAGS
  --no-input                Don't interactively ask for any input from the user
  --noxes=<value>           Number of Compute Peers to generate when a new provider.yaml is created
  --priv-key=<private-key>  !WARNING! for debug purposes only. Passing private keys through flags is unsecure
  --timeout=<value>         [default: 120] Timeout in seconds for attempting to register local network on local peers

DESCRIPTION
  Run docker-compose.yaml using docker compose

EXAMPLES
  $ fluence local up
```

_See code: [src/commands/local/up.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/local/up.ts)_

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
  --service=<name | path>  Service name from fluence.yaml or path to the service config or directory that contains
                           service.yaml

DESCRIPTION
  Add module to service.yaml

EXAMPLES
  $ fluence module add
```

_See code: [src/commands/module/add.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/module/add.ts)_

## `fluence module new [NAME]`

Create new marine module template

```
USAGE
  $ fluence module new [NAME] [--no-input] [--path <value>] [--service <value>]

ARGUMENTS
  NAME  Module name

FLAGS
  --no-input                        Don't interactively ask for any input from the user
  --path=<path>                     Path to module dir (default: src/modules)
  --service=<name | relative_path>  Name or relative path to the service to add the created module to

DESCRIPTION
  Create new marine module template

EXAMPLES
  $ fluence module new
```

_See code: [src/commands/module/new.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/module/new.ts)_

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

_See code: [src/commands/module/remove.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/module/remove.ts)_

## `fluence provider add-peer`

Register specific nox instance as a Compute Peer

```
USAGE
  $ fluence provider add-peer [--no-input] [--priv-key <value>] [-n <value>] [--env <value>] [--peer-id <value>]
    [--compute-units <value>]

FLAGS
  -n, --name=<value>                      Provider config name
  --compute-units=<value>...              Number of compute units to add for each peer
  --env=<kras | testnet | stage | local>  Environment to use when generating the provider config
  --no-input                              Don't interactively ask for any input from the user
  --peer-id=<value>...                    Peer id of the compute peer
  --priv-key=<private-key>                !WARNING! for debug purposes only. Passing private keys through flags is
                                          unsecure

DESCRIPTION
  Register specific nox instance as a Compute Peer
```

_See code: [src/commands/provider/add-peer.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/add-peer.ts)_

## `fluence provider add-units`

Add units to specific nox instance as a Compute Peer

```
USAGE
  $ fluence provider add-units [--no-input] [--priv-key <value>] [--env <value>] [--peer-id <value>] [--units <value>]

FLAGS
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --peer-id=<peer-id>                              Peer id of the nox instance that you want to register as a Compute
                                                   Peer
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --units=<number>                                 Number of available worker units on this Compute Peer

DESCRIPTION
  Add units to specific nox instance as a Compute Peer
```

_See code: [src/commands/provider/add-units.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/add-units.ts)_

## `fluence provider gen`

Generate Config.toml files according to provider.yaml

```
USAGE
  $ fluence provider gen [--no-input] [--noxes <value>] [-n <value>] [--env <value>]

FLAGS
  -n, --name=<value>                      Provider config name
  --env=<kras | testnet | stage | local>  Environment to use when generating the provider config
  --no-input                              Don't interactively ask for any input from the user
  --noxes=<value>                         Number of Compute Peers to generate when a new provider.yaml is created

DESCRIPTION
  Generate Config.toml files according to provider.yaml

EXAMPLES
  $ fluence provider gen
```

_See code: [src/commands/provider/gen.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/gen.ts)_

## `fluence provider info`

Get info about provider

```
USAGE
  $ fluence provider info --provider-address <value> [--no-input] [--env <value>]

FLAGS
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --provider-address=<value>                       (required) Compute provider address

DESCRIPTION
  Get info about provider
```

_See code: [src/commands/provider/info.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/info.ts)_

## `fluence provider init`

Init provider config. Creates a config file

```
USAGE
  $ fluence provider init [--no-input] [--noxes <value>] [-n <value>] [--env <value>]

FLAGS
  -n, --name=<value>                      Provider config name
  --env=<kras | testnet | stage | local>  Environment to use when generating the provider config
  --no-input                              Don't interactively ask for any input from the user
  --noxes=<value>                         Number of Compute Peers to generate when a new provider.yaml is created

DESCRIPTION
  Init provider config. Creates a config file
```

_See code: [src/commands/provider/init.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/init.ts)_

## `fluence provider register`

Register in matching contract

```
USAGE
  $ fluence provider register [--no-input] [--priv-key <value>] [-n <value>] [--env <value>] [--noxes <value>] [--offer
    <value>]

FLAGS
  -n, --name=<value>                      Provider config name
  --env=<kras | testnet | stage | local>  Environment to use when generating the provider config
  --no-input                              Don't interactively ask for any input from the user
  --noxes=<value>                         Number of Compute Peers to generate when a new provider.yaml is created
  --offer=<offer>                         Offer from provider.yaml to use
  --priv-key=<private-key>                !WARNING! for debug purposes only. Passing private keys through flags is
                                          unsecure

DESCRIPTION
  Register in matching contract
```

_See code: [src/commands/provider/register.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/register.ts)_

## `fluence provider remove-peer`

Remove specific nox instance as a Compute Peer

```
USAGE
  $ fluence provider remove-peer [--no-input] [--priv-key <value>] [--env <value>] [--peer-id <value>]

FLAGS
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --peer-id=<peer-id>                              Peer id of the nox instance that you want to register as a Compute
                                                   Peer
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure

DESCRIPTION
  Remove specific nox instance as a Compute Peer
```

_See code: [src/commands/provider/remove-peer.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/remove-peer.ts)_

## `fluence provider remove-units`

Sub units to specific nox instance as a Compute Peer

```
USAGE
  $ fluence provider remove-units [--no-input] [--priv-key <value>] [--env <value>] [--peer-id <value>] [--units
  <value>]

FLAGS
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --peer-id=<peer-id>                              Peer id of the nox instance that you want to register as a Compute
                                                   Peer
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --units=<number>                                 Number of available worker units on this Compute Peer

DESCRIPTION
  Sub units to specific nox instance as a Compute Peer
```

_See code: [src/commands/provider/remove-units.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/provider/remove-units.ts)_

## `fluence run`

Run aqua script

```
USAGE
  $ fluence run [--no-input] [--data <value>] [--data-path <value>] [--import <value>]
    [--log-level-compiler <value>] [--quiet] [--const <value>] [-i <value>] [-f <value>] [--no-xor] [--no-relay]
    [--print-air | -b] [--off-aqua-logs] [-k <value>] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [--env <value>] [--tracing]

FLAGS
  -b, --print-beautified-air                       Prints beautified AIR code before function execution
  -f, --func=<function-call>                       Function call. Example: funcName("stringArg")
  -i, --input=<path>                               Path to an aqua file or to a directory that contains aqua files
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --const=<NAME="value">...                        Constant that will be used in the aqua code that you run (example of
                                                   aqua code: SOME_CONST ?= "default_value"). Constant name must be
                                                   upper cased.
  --data=<json>                                    JSON in { [argumentName]: argumentValue } format. You can call a
                                                   function using these argument names like this: -f
                                                   'myFunc(argumentName)'. Arguments in this flag override arguments in
                                                   the --data-path flag
  --data-path=<path>                               Path to a JSON file in { [argumentName]: argumentValue } format. You
                                                   can call a function using these argument names like this: -f
                                                   'myFunc(argumentName)'. Arguments in this flag can be overridden
                                                   using --data flag
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --import=<path>...                               Path to a directory to import aqua files from. May be used several
                                                   times
  --log-level-compiler=<level>                     Set log level for the compiler. Must be one of: Must be one of: all,
                                                   trace, debug, info, warn, error, off
  --no-input                                       Don't interactively ask for any input from the user
  --no-relay                                       Do not generate a pass through the relay node
  --no-xor                                         Do not generate a wrapper that catches and displays errors
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --print-air                                      Prints generated AIR code before function execution
  --quiet                                          Print only execution result. Overrides all --log-level-* flags
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.

DESCRIPTION
  Run aqua script

EXAMPLES
  $ fluence run
```

_See code: [src/commands/run.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/run.ts)_

## `fluence service add [PATH | URL]`

Add service to fluence.yaml

```
USAGE
  $ fluence service add [PATH | URL] [--no-input] [--name <value>] [--marine-build-args <value>]

ARGUMENTS
  PATH | URL  Path to a service or url to .tar.gz archive

FLAGS
  --marine-build-args=<--flag arg>  Space separated `cargo build` flags and args to pass to marine build. Overrides
                                    'marineBuildArgs' property in fluence.yaml. Default: --release
  --name=<name>                     Override service name (must start with a lowercase letter and contain only letters,
                                    numbers, and underscores)
  --no-input                        Don't interactively ask for any input from the user

DESCRIPTION
  Add service to fluence.yaml

EXAMPLES
  $ fluence service add
```

_See code: [src/commands/service/add.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/service/add.ts)_

## `fluence service new [NAME]`

Create new marine service template

```
USAGE
  $ fluence service new [NAME] [--no-input] [--path <value>]

ARGUMENTS
  NAME  Unique service name (must start with a lowercase letter and contain only letters, numbers, and underscores)

FLAGS
  --no-input     Don't interactively ask for any input from the user
  --path=<path>  Path to services dir (default: src/services)

DESCRIPTION
  Create new marine service template

EXAMPLES
  $ fluence service new
```

_See code: [src/commands/service/new.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/service/new.ts)_

## `fluence service remove [NAME | PATH | URL]`

Remove service from fluence.yaml services property and from all of the workers

```
USAGE
  $ fluence service remove [NAME | PATH | URL] [--no-input]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Remove service from fluence.yaml services property and from all of the workers

EXAMPLES
  $ fluence service remove
```

_See code: [src/commands/service/remove.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/service/remove.ts)_

## `fluence service repl [NAME | PATH | URL]`

Open service inside repl (downloads and builds modules if necessary)

```
USAGE
  $ fluence service repl [NAME | PATH | URL] [--no-input] [--marine-build-args <value>]

ARGUMENTS
  NAME | PATH | URL  Service name from fluence.yaml, path to a service or url to .tar.gz archive

FLAGS
  --marine-build-args=<--flag arg>  Space separated `cargo build` flags and args to pass to marine build. Overrides
                                    'marineBuildArgs' property in fluence.yaml. Default: --release
  --no-input                        Don't interactively ask for any input from the user

DESCRIPTION
  Open service inside repl (downloads and builds modules if necessary)

EXAMPLES
  $ fluence service repl
```

_See code: [src/commands/service/repl.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/service/repl.ts)_

## `fluence spell build [SPELL-NAMES]`

Compile spells aqua

```
USAGE
  $ fluence spell build [SPELL-NAMES] [--no-input] [--import <value>]

ARGUMENTS
  SPELL-NAMES  Comma separated names of spells to build. Example: "spell1,spell2" (by default all spells from 'spells'
               property in fluence.yaml will be built)

FLAGS
  --import=<path>...  Path to a directory to import aqua files from. May be used several times
  --no-input          Don't interactively ask for any input from the user

DESCRIPTION
  Compile spells aqua

EXAMPLES
  $ fluence spell build
```

_See code: [src/commands/spell/build.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/spell/build.ts)_

## `fluence spell new [NAME]`

Create a new spell template

```
USAGE
  $ fluence spell new [NAME] [--no-input] [--path <value>]

ARGUMENTS
  NAME  Spell name

FLAGS
  --no-input     Don't interactively ask for any input from the user
  --path=<path>  Path to spells dir (default: src/spells)

DESCRIPTION
  Create a new spell template

EXAMPLES
  $ fluence spell new
```

_See code: [src/commands/spell/new.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/spell/new.ts)_

## `fluence update [CHANNEL]`

update the fluence CLI

```
USAGE
  $ fluence update [CHANNEL] [-a] [--force] [-i | -v <value>]

FLAGS
  -a, --available        See available versions.
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

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.1.3/src/commands/update.ts)_

## `fluence workers deploy [WORKER-NAMES]`

Deploy workers to hosts, described in 'hosts' property in fluence.yaml

```
USAGE
  $ fluence workers deploy [WORKER-NAMES] [--no-input] [-k <value>] [--off-aqua-logs] [--priv-key <value>] [--relay
    <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--env <value>] [--import <value>] [--no-build]
    [--tracing] [--marine-build-args <value>]

ARGUMENTS
  WORKER-NAMES  Comma separated names of workers to deploy. Example: "worker1,worker2" (by default all workers from
                'hosts' property in fluence.yaml are deployed)

FLAGS
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --import=<path>...                               Path to a directory to import aqua files from. May be used several
                                                   times
  --marine-build-args=<--flag arg>                 Space separated `cargo build` flags and args to pass to marine build.
                                                   Overrides 'marineBuildArgs' property in fluence.yaml. Default:
                                                   --release
  --no-build                                       Don't build the project before running the command
  --no-input                                       Don't interactively ask for any input from the user
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.

DESCRIPTION
  Deploy workers to hosts, described in 'hosts' property in fluence.yaml

EXAMPLES
  $ fluence workers deploy
```

_See code: [src/commands/workers/deploy.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/workers/deploy.ts)_

## `fluence workers logs [WORKER-NAMES]`

Get logs from deployed workers for hosts listed in workers.yaml

```
USAGE
  $ fluence workers logs [WORKER-NAMES] [--no-input] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [--env <value>] [-k <value>] [--off-aqua-logs] [--priv-key <value>] [--worker-id <value>] [--host-id
    <value>] [--spell-id <value>] [--tracing]

ARGUMENTS
  WORKER-NAMES  Worker names to get logs for (by default all worker names from 'hosts' property of workers.yaml)

FLAGS
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --host-id=<host-id>                              Host id
  --no-input                                       Don't interactively ask for any input from the user
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --spell-id=<spell-id>                            [default: worker-spell] Spell id
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.
  --worker-id=<worker-id>                          Worker id

DESCRIPTION
  Get logs from deployed workers for hosts listed in workers.yaml

EXAMPLES
  $ fluence workers logs
```

_See code: [src/commands/workers/logs.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/workers/logs.ts)_

## `fluence workers remove [WORKER-NAMES]`

Remove workers from hosts, described in 'hosts' property in workers.yaml

```
USAGE
  $ fluence workers remove [WORKER-NAMES] [--no-input] [-k <value>] [--off-aqua-logs] [--priv-key <value>] [--relay
    <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--env <value>] [--tracing]

ARGUMENTS
  WORKER-NAMES  Comma separated names of workers to remove. Example: "worker1,worker2" (by default all workers from
                'hosts' property in workers.yaml are removed)

FLAGS
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                                       Don't interactively ask for any input from the user
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.

DESCRIPTION
  Remove workers from hosts, described in 'hosts' property in workers.yaml

EXAMPLES
  $ fluence workers remove
```

_See code: [src/commands/workers/remove.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/workers/remove.ts)_

## `fluence workers upload [WORKER-NAMES]`

Upload workers to hosts, described in 'hosts' property in fluence.yaml

```
USAGE
  $ fluence workers upload [WORKER-NAMES] [--no-input] [--relay <value>] [--ttl <value>] [--dial-timeout <value>]
    [--particle-id] [--env <value>] [-k <value>] [--off-aqua-logs] [--priv-key <value>] [--import <value>] [--no-build]
    [--tracing] [--marine-build-args <value>]

ARGUMENTS
  WORKER-NAMES  Names of workers to deploy (by default all workers from 'hosts' property in fluence.yaml are deployed)

FLAGS
  -k, --sk=<name>                                  Name of a peer's Network Private Key
  --dial-timeout=<milliseconds>                    [default: 60000] Timeout for Fluence js-client to connect to relay
                                                   peer
  --env=<kras | testnet | stage | local | custom>  Fluence Environment to use when running the command
  --import=<path>...                               Path to a directory to import aqua files from. May be used several
                                                   times
  --marine-build-args=<--flag arg>                 Space separated `cargo build` flags and args to pass to marine build.
                                                   Overrides 'marineBuildArgs' property in fluence.yaml. Default:
                                                   --release
  --no-build                                       Don't build the project before running the command
  --no-input                                       Don't interactively ask for any input from the user
  --off-aqua-logs                                  Turns off logs from Console.print in aqua and from IPFS service
  --particle-id                                    Print particle ids when running Fluence js-client
  --priv-key=<private-key>                         !WARNING! for debug purposes only. Passing private keys through flags
                                                   is unsecure
  --relay=<multiaddress>                           Relay for Fluence js-client to connect to
  --tracing                                        Compile aqua in tracing mode (for debugging purposes)
  --ttl=<milliseconds>                             [default: 120000] Particle Time To Live since 'now'. After that,
                                                   particle is expired and not processed.

DESCRIPTION
  Upload workers to hosts, described in 'hosts' property in fluence.yaml

EXAMPLES
  $ fluence workers upload
```

_See code: [src/commands/workers/upload.ts](https://github.com/fluencelabs/cli/blob/v0.13.0/src/commands/workers/upload.ts)_
<!-- commandsstop -->
