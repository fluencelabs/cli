# Commands
<!-- commands -->
* [`fluence air beautify [PATH]`](#fluence-air-beautify-path)
* [`fluence aqua`](#fluence-aqua)
* [`fluence aqua imports`](#fluence-aqua-imports)
* [`fluence aqua json [INPUT] [OUTPUT]`](#fluence-aqua-json-input-output)
* [`fluence aqua yml [INPUT] [OUTPUT]`](#fluence-aqua-yml-input-output)
* [`fluence autocomplete [SHELL]`](#fluence-autocomplete-shell)
* [`fluence build`](#fluence-build)
* [`fluence chain info`](#fluence-chain-info)
* [`fluence chain proof`](#fluence-chain-proof)
* [`fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID]`](#fluence-deal-change-app-deal-address-new-app-cid)
* [`fluence deal create`](#fluence-deal-create)
* [`fluence deal deposit [AMOUNT] [DEPLOYMENT-NAMES]`](#fluence-deal-deposit-amount-deployment-names)
* [`fluence deal info [DEPLOYMENT-NAMES]`](#fluence-deal-info-deployment-names)
* [`fluence deal logs [DEPLOYMENT-NAMES]`](#fluence-deal-logs-deployment-names)
* [`fluence deal stop [DEPLOYMENT-NAMES]`](#fluence-deal-stop-deployment-names)
* [`fluence deal withdraw [AMOUNT] [DEPLOYMENT-NAMES]`](#fluence-deal-withdraw-amount-deployment-names)
* [`fluence deal workers-add [DEPLOYMENT-NAMES]`](#fluence-deal-workers-add-deployment-names)
* [`fluence deal workers-remove [UNIT-IDS]`](#fluence-deal-workers-remove-unit-ids)
* [`fluence default env [ENV]`](#fluence-default-env-env)
* [`fluence default peers [ENV]`](#fluence-default-peers-env)
* [`fluence delegator collateral-add [IDS]`](#fluence-delegator-collateral-add-ids)
* [`fluence delegator collateral-withdraw [IDS]`](#fluence-delegator-collateral-withdraw-ids)
* [`fluence delegator reward-withdraw [IDS]`](#fluence-delegator-reward-withdraw-ids)
* [`fluence dep install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`](#fluence-dep-install-package-name--package-nameversion)
* [`fluence dep reset`](#fluence-dep-reset)
* [`fluence dep uninstall PACKAGE-NAME`](#fluence-dep-uninstall-package-name)
* [`fluence dep versions`](#fluence-dep-versions)
* [`fluence deploy [DEPLOYMENT-NAMES]`](#fluence-deploy-deployment-names)
* [`fluence help [COMMANDS]`](#fluence-help-commands)
* [`fluence init [PATH]`](#fluence-init-path)
* [`fluence key default [NAME]`](#fluence-key-default-name)
* [`fluence key new [NAME]`](#fluence-key-new-name)
* [`fluence key remove [NAME]`](#fluence-key-remove-name)
* [`fluence local down`](#fluence-local-down)
* [`fluence local init`](#fluence-local-init)
* [`fluence local logs`](#fluence-local-logs)
* [`fluence local ps`](#fluence-local-ps)
* [`fluence local up`](#fluence-local-up)
* [`fluence module add [PATH | URL]`](#fluence-module-add-path--url)
* [`fluence module new [NAME]`](#fluence-module-new-name)
* [`fluence module remove [NAME | PATH | URL]`](#fluence-module-remove-name--path--url)
* [`fluence provider cc-activate`](#fluence-provider-cc-activate)
* [`fluence provider cc-create`](#fluence-provider-cc-create)
* [`fluence provider cc-info`](#fluence-provider-cc-info)
* [`fluence provider cc-update`](#fluence-provider-cc-update)
* [`fluence provider cc-withdraw-collateral`](#fluence-provider-cc-withdraw-collateral)
* [`fluence provider cc-withdraw-rewards`](#fluence-provider-cc-withdraw-rewards)
* [`fluence provider deal-exit [DEAL-IDS]`](#fluence-provider-deal-exit-deal-ids)
* [`fluence provider deal-list`](#fluence-provider-deal-list)
* [`fluence provider deal-reward-info [DEAL-ADDRESS] [UNIT-ID]`](#fluence-provider-deal-reward-info-deal-address-unit-id)
* [`fluence provider deal-withdraw [DEAL-IDS]`](#fluence-provider-deal-withdraw-deal-ids)
* [`fluence provider gen`](#fluence-provider-gen)
* [`fluence provider init`](#fluence-provider-init)
* [`fluence provider offer-create`](#fluence-provider-offer-create)
* [`fluence provider offer-info`](#fluence-provider-offer-info)
* [`fluence provider offer-update`](#fluence-provider-offer-update)
* [`fluence provider register`](#fluence-provider-register)
* [`fluence provider signing-wallets`](#fluence-provider-signing-wallets)
* [`fluence provider tokens-distribute`](#fluence-provider-tokens-distribute)
* [`fluence provider update`](#fluence-provider-update)
* [`fluence run`](#fluence-run)
* [`fluence service add [PATH | URL]`](#fluence-service-add-path--url)
* [`fluence service new [NAME]`](#fluence-service-new-name)
* [`fluence service remove [NAME | PATH | URL]`](#fluence-service-remove-name--path--url)
* [`fluence service repl [NAME | PATH | URL]`](#fluence-service-repl-name--path--url)
* [`fluence spell build [SPELL-NAMES]`](#fluence-spell-build-spell-names)
* [`fluence spell new [NAME]`](#fluence-spell-new-name)
* [`fluence update [CHANNEL]`](#fluence-update-channel)

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

_See code: [src/commands/air/beautify.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/air/beautify.ts)_

## `fluence aqua`

Compile aqua defined in 'compileAqua' property of fluence.yaml. If --input flag is used - then content of 'compileAqua' property in fluence.yaml will be ignored

```
USAGE
  $ fluence aqua [-n <value>] [--no-input] [-w] [-o <value>] [--air | --js] [--import <value>] [-i
    <value>] [--const <value>] [--log-level-compiler <value>] [--no-relay] [--no-xor] [--tracing] [--no-empty-response]
    [--dry]

FLAGS
  -i, --input=<path>                Path to an aqua file or a directory that contains your aqua files
  -n, --names=<value>               Comma-separated names of the configs from 'compileAqua' property of fluence.yaml to
                                    compile. If not specified, all configs will be compiled
  -o, --output=<path>               Path to the output directory. Must be relative to the current working directory or
                                    absolute. Will be created if it doesn't exists
  -w, --watch                       Watch aqua file or folder for changes and recompile
      --air                         Generate .air file instead of .ts
      --const=<NAME=value>...       Constants to be passed to the compiler
      --dry                         Checks if compilation succeeded, without output
      --import=<path>...            Path to a directory to import aqua files from. May be used several times
      --js                          Generate .js file instead of .ts
      --log-level-compiler=<level>  Set log level for the compiler. Must be one of: all, trace, debug, info, warn,
                                    error, off
      --no-empty-response           Do not generate response call if there are no returned values
      --no-input                    Don't interactively ask for any input from the user
      --no-relay                    Do not generate a pass through the relay node
      --no-xor                      Do not generate a wrapper that catches and displays errors
      --tracing                     Compile aqua in tracing mode (for debugging purposes)

DESCRIPTION
  Compile aqua defined in 'compileAqua' property of fluence.yaml. If --input flag is used - then content of
  'compileAqua' property in fluence.yaml will be ignored

EXAMPLES
  $ fluence aqua
```

_See code: [src/commands/aqua.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/aqua.ts)_

## `fluence aqua imports`

Returns a list of aqua imports that CLI produces

```
USAGE
  $ fluence aqua imports [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Returns a list of aqua imports that CLI produces
```

_See code: [src/commands/aqua/imports.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/aqua/imports.ts)_

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

_See code: [src/commands/aqua/json.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/aqua/json.ts)_

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

_See code: [src/commands/aqua/yml.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/aqua/yml.ts)_

## `fluence autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ fluence autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ fluence autocomplete

  $ fluence autocomplete bash

  $ fluence autocomplete zsh

  $ fluence autocomplete powershell

  $ fluence autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.0.5/src/commands/autocomplete/index.ts)_

## `fluence build`

Build all application services, described in fluence.yaml and generate aqua interfaces for them

```
USAGE
  $ fluence build [--no-input] [--marine--args <value>] [--import <value>] [--env <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --import=<path>...                    Path to a directory to import aqua files from. May be used several times
  --marine-build-args=<--flag arg>      Space separated `cargo build` flags and args to pass to marine build. Overrides
                                        'marineBuildArgs' property in fluence.yaml. Default: --release
  --no-input                            Don't interactively ask for any input from the user

DESCRIPTION
  Build all application services, described in fluence.yaml and generate aqua interfaces for them

EXAMPLES
  $ fluence build
```

_See code: [src/commands/build.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/build.ts)_

## `fluence chain info`

Show contract addresses for the fluence environment and accounts for the local environment

```
USAGE
  $ fluence chain info [--no-input] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Show contract addresses for the fluence environment and accounts for the local environment
```

_See code: [src/commands/chain/info.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/chain/info.ts)_

## `fluence chain proof`

Send garbage proof for testing purposes

```
USAGE
  $ fluence chain proof [--no-input] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Send garbage proof for testing purposes
```

_See code: [src/commands/chain/proof.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/chain/proof.ts)_

## `fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID]`

Change app id in the deal

```
USAGE
  $ fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  DEAL-ADDRESS  Deal address
  NEW-APP-CID   New app CID for the deal

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Change app id in the deal
```

_See code: [src/commands/deal/change-app.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/change-app.ts)_

## `fluence deal create`

Create your deal with the specified parameters

```
USAGE
  $ fluence deal create --app-cid <value> --collateral-per-worker <value> --min-workers <value> --target-workers
    <value> --max-workers-per-provider <value> --price-per-worker-epoch <value> [--no-input] [--initial-balance <value>]
    [--effectors <value>] [--whitelist <value> | --blacklist <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --app-cid=<value>                     (required) CID of the application that will be deployed
  --blacklist=<value>                   Comma-separated list of blacklisted providers
  --collateral-per-worker=<value>       (required) Collateral per worker
  --effectors=<value>                   Comma-separated list of effector to be used in the deal
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --initial-balance=<value>             Initial balance
  --max-workers-per-provider=<value>    (required) Max workers per provider
  --min-workers=<value>                 (required) Required workers to activate the deal
  --no-input                            Don't interactively ask for any input from the user
  --price-per-worker-epoch=<value>      (required) Price per worker epoch
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default
  --target-workers=<value>              (required) Max workers in the deal
  --whitelist=<value>                   Comma-separated list of whitelisted providers

DESCRIPTION
  Create your deal with the specified parameters
```

_See code: [src/commands/deal/create.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/create.ts)_

## `fluence deal deposit [AMOUNT] [DEPLOYMENT-NAMES]`

Deposit do the deal

```
USAGE
  $ fluence deal deposit [AMOUNT] [DEPLOYMENT-NAMES] [--no-input] [--env <value>] [--priv-key <value>] [--deal-ids
    <value>]

ARGUMENTS
  AMOUNT            Amount of USDC tokens to deposit
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                Comma-separated deal ids of the deployed deal. Can't be used together with
                                        DEPLOYMENT-NAMES arg
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Deposit do the deal
```

_See code: [src/commands/deal/deposit.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/deposit.ts)_

## `fluence deal info [DEPLOYMENT-NAMES]`

Get info about the deal

```
USAGE
  $ fluence deal info [DEPLOYMENT-NAMES] [--no-input] [--env <value>] [--priv-key <value>] [--deal-ids <value>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                Comma-separated deal ids of the deployed deal. Can't be used together with
                                        DEPLOYMENT-NAMES arg
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Get info about the deal
```

_See code: [src/commands/deal/info.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/info.ts)_

## `fluence deal logs [DEPLOYMENT-NAMES]`

Get logs from deployed workers for deals listed in workers.yaml

```
USAGE
  $ fluence deal logs [DEPLOYMENT-NAMES] [--no-input] [-k <value>] [--relay <value>] [--ttl <value>]
    [--dial-timeout <value>] [--particle-id] [--env <value>] [--off-aqua-logs] [--tracing] [--deal-ids <value>] [--spell
    <value>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  -k, --sk=<name>                           Name of the secret key for js-client inside CLI to use. If not specified,
                                            will use the default key for the project. If there is no fluence project or
                                            there is no default key, will use user's default key
      --deal-ids=<id-1,id-2>                Comma-separated deal ids of the deployed deal. Can't be used together with
                                            DEPLOYMENT-NAMES arg
      --dial-timeout=<milliseconds>         [default: 15000] Timeout for Fluence js-client to connect to relay peer
      --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
      --no-input                            Don't interactively ask for any input from the user
      --off-aqua-logs                       Turns off logs from Console.print in aqua and from IPFS service
      --particle-id                         Print particle ids when running Fluence js-client
      --relay=<multiaddress>                Relay for Fluence js-client to connect to
      --spell=<spell-name>                  [default: worker-spell] Spell name to get logs for
      --tracing                             Compile aqua in tracing mode (for debugging purposes)
      --ttl=<milliseconds>                  [default: 15000] Particle Time To Live since 'now'. After that, particle is
                                            expired and not processed.

DESCRIPTION
  Get logs from deployed workers for deals listed in workers.yaml

EXAMPLES
  $ fluence deal logs
```

_See code: [src/commands/deal/logs.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/logs.ts)_

## `fluence deal stop [DEPLOYMENT-NAMES]`

Stop the deal

```
USAGE
  $ fluence deal stop [DEPLOYMENT-NAMES] [--no-input] [--env <value>] [--priv-key <value>] [--deal-ids <value>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                Comma-separated deal ids of the deployed deal. Can't be used together with
                                        DEPLOYMENT-NAMES arg
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Stop the deal
```

_See code: [src/commands/deal/stop.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/stop.ts)_

## `fluence deal withdraw [AMOUNT] [DEPLOYMENT-NAMES]`

Withdraw tokens from the deal

```
USAGE
  $ fluence deal withdraw [AMOUNT] [DEPLOYMENT-NAMES] [--no-input] [--env <value>] [--priv-key <value>] [--deal-ids
    <value>]

ARGUMENTS
  AMOUNT            Amount of USDC tokens to withdraw
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                Comma-separated deal ids of the deployed deal. Can't be used together with
                                        DEPLOYMENT-NAMES arg
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Withdraw tokens from the deal
```

_See code: [src/commands/deal/withdraw.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/withdraw.ts)_

## `fluence deal workers-add [DEPLOYMENT-NAMES]`

Add missing workers to the deal

```
USAGE
  $ fluence deal workers-add [DEPLOYMENT-NAMES] [--no-input] [--env <value>] [--priv-key <value>] [--deal-ids <value>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                Comma-separated deal ids of the deployed deal. Can't be used together with
                                        DEPLOYMENT-NAMES arg
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Add missing workers to the deal

ALIASES
  $ fluence deal wa
```

_See code: [src/commands/deal/workers-add.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/workers-add.ts)_

## `fluence deal workers-remove [UNIT-IDS]`

Remove unit from the deal

```
USAGE
  $ fluence deal workers-remove [UNIT-IDS] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  UNIT-IDS  Comma-separated compute unit ids. You can get them using 'fluence deal info' command

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Remove unit from the deal

ALIASES
  $ fluence deal wr
```

_See code: [src/commands/deal/workers-remove.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deal/workers-remove.ts)_

## `fluence default env [ENV]`

Switch default Fluence Environment

```
USAGE
  $ fluence default env [ENV] [--no-input]

ARGUMENTS
  ENV  Fluence Environment to use when running the command

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Switch default Fluence Environment

EXAMPLES
  $ fluence default env
```

_See code: [src/commands/default/env.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/default/env.ts)_

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

_See code: [src/commands/default/peers.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/default/peers.ts)_

## `fluence delegator collateral-add [IDS]`

Add FLT collateral to capacity commitment

```
USAGE
  $ fluence delegator collateral-add [IDS] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  IDS  Comma separated capacity commitment IDs

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Add FLT collateral to capacity commitment

ALIASES
  $ fluence delegator ca
```

_See code: [src/commands/delegator/collateral-add.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/delegator/collateral-add.ts)_

## `fluence delegator collateral-withdraw [IDS]`

Withdraw FLT collateral from capacity commitment

```
USAGE
  $ fluence delegator collateral-withdraw [IDS] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  IDS  Comma separated capacity commitment IDs

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Withdraw FLT collateral from capacity commitment

ALIASES
  $ fluence delegator cw
```

_See code: [src/commands/delegator/collateral-withdraw.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/delegator/collateral-withdraw.ts)_

## `fluence delegator reward-withdraw [IDS]`

Withdraw FLT rewards from capacity commitment

```
USAGE
  $ fluence delegator reward-withdraw [IDS] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  IDS  Comma separated capacity commitment IDs

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Withdraw FLT rewards from capacity commitment

ALIASES
  $ fluence delegator rw
```

_See code: [src/commands/delegator/reward-withdraw.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/delegator/reward-withdraw.ts)_

## `fluence dep install [PACKAGE-NAME | PACKAGE-NAME@VERSION]`

Install aqua project dependencies (currently npm is used under the hood for managing aqua dependencies)

```
USAGE
  $ fluence dep install [PACKAGE-NAME | PACKAGE-NAME@VERSION] [--no-input]

ARGUMENTS
  PACKAGE-NAME | PACKAGE-NAME@VERSION  Valid argument for npm install command. If this argument is omitted all project
                                       aqua dependencies will be installed and command will also make sure marine and
                                       mrepl are installed

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Install aqua project dependencies (currently npm is used under the hood for managing aqua dependencies)

ALIASES
  $ fluence dep i

EXAMPLES
  $ fluence dep install
```

_See code: [src/commands/dep/install.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/dep/install.ts)_

## `fluence dep reset`

Reset all project dependencies to recommended versions

```
USAGE
  $ fluence dep reset [--no-input]

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Reset all project dependencies to recommended versions

ALIASES
  $ fluence dep r

EXAMPLES
  $ fluence dep reset
```

_See code: [src/commands/dep/reset.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/dep/reset.ts)_

## `fluence dep uninstall PACKAGE-NAME`

Uninstall aqua project dependencies (currently npm is used under the hood for managing aqua dependencies)

```
USAGE
  $ fluence dep uninstall PACKAGE-NAME [--no-input]

ARGUMENTS
  PACKAGE-NAME  Aqua dependency name

FLAGS
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Uninstall aqua project dependencies (currently npm is used under the hood for managing aqua dependencies)

ALIASES
  $ fluence dep un

EXAMPLES
  $ fluence dep uninstall
```

_See code: [src/commands/dep/uninstall.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/dep/uninstall.ts)_

## `fluence dep versions`

Get versions of all cli dependencies, including aqua, marine, mrepl and internal

```
USAGE
  $ fluence dep versions [--no-input] [--default]

FLAGS
  --default   Display default npm and cargo dependencies and their versions for current CLI version. Default npm
              dependencies are always available to be imported in Aqua
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Get versions of all cli dependencies, including aqua, marine, mrepl and internal

ALIASES
  $ fluence dep v

EXAMPLES
  $ fluence dep versions
```

_See code: [src/commands/dep/versions.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/dep/versions.ts)_

## `fluence deploy [DEPLOYMENT-NAMES]`

Deploy according to 'deployments' property in fluence.yaml

```
USAGE
  $ fluence deploy [DEPLOYMENT-NAMES] [--no-input] [--off-aqua-logs] [--env <value>] [--priv-key <value>]
    [-k <value>] [--relay <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--import <value>]
    [--no-build] [--tracing] [--marine-build-args <value>] [--auto-match] [-u]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  -k, --sk=<name>                           Name of the secret key for js-client inside CLI to use. If not specified,
                                            will use the default key for the project. If there is no fluence project or
                                            there is no default key, will use user's default key
  -u, --update                              Update your previous deployment
      --[no-]auto-match                     Toggle automatic matching. Auto-matching is turned on by default
      --dial-timeout=<milliseconds>         [default: 15000] Timeout for Fluence js-client to connect to relay peer
      --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
      --import=<path>...                    Path to a directory to import aqua files from. May be used several times
      --marine-build-args=<--flag arg>      Space separated `cargo build` flags and args to pass to marine build.
                                            Overrides 'marineBuildArgs' property in fluence.yaml. Default: --release
      --no-build                            Don't build the project before running the command
      --no-input                            Don't interactively ask for any input from the user
      --off-aqua-logs                       Turns off logs from Console.print in aqua and from IPFS service
      --particle-id                         Print particle ids when running Fluence js-client
      --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                            unsecure. On local network
                                            0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will
                                            be used by default
      --relay=<multiaddress>                Relay for Fluence js-client to connect to
      --tracing                             Compile aqua in tracing mode (for debugging purposes)
      --ttl=<milliseconds>                  [default: 15000] Particle Time To Live since 'now'. After that, particle is
                                            expired and not processed.

DESCRIPTION
  Deploy according to 'deployments' property in fluence.yaml

EXAMPLES
  $ fluence deploy
```

_See code: [src/commands/deploy.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/deploy.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.11/src/commands/help.ts)_

## `fluence init [PATH]`

Initialize fluence project

```
USAGE
  $ fluence init [PATH] [--no-input] [-t <value>] [--env <value>] [--noxes <value>]

ARGUMENTS
  PATH  Project path

FLAGS
  -t, --template=<value>                    Template to use for the project. One of: quickstart, minimal, ts, js
      --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
      --no-input                            Don't interactively ask for any input from the user
      --noxes=<value>                       Number of Compute Peers to generate when a new provider.yaml is created

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ fluence init
```

_See code: [src/commands/init.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/init.ts)_

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

_See code: [src/commands/key/default.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/key/default.ts)_

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

_See code: [src/commands/key/new.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/key/new.ts)_

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

_See code: [src/commands/key/remove.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/key/remove.ts)_

## `fluence local down`

Stop currently running docker-compose.yaml using docker compose

```
USAGE
  $ fluence local down [--no-input] [-v] [--flags <value>]

FLAGS
  -v, --volumes             Remove named volumes declared in the "volumes" section of the Compose file and anonymous
                            volumes attached to containers
      --flags=<--flag arg>  Space separated flags to pass to `docker compose`
      --no-input            Don't interactively ask for any input from the user

DESCRIPTION
  Stop currently running docker-compose.yaml using docker compose

EXAMPLES
  $ fluence local down
```

_See code: [src/commands/local/down.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/local/down.ts)_

## `fluence local init`

Init docker-compose.yaml according to provider.yaml

```
USAGE
  $ fluence local init [--no-input] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Init docker-compose.yaml according to provider.yaml

EXAMPLES
  $ fluence local init
```

_See code: [src/commands/local/init.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/local/init.ts)_

## `fluence local logs`

Display docker-compose.yaml logs

```
USAGE
  $ fluence local logs [--no-input] [--flags <value>]

FLAGS
  --flags=<--flag arg>  Space separated flags to pass to `docker compose`
  --no-input            Don't interactively ask for any input from the user

DESCRIPTION
  Display docker-compose.yaml logs

EXAMPLES
  $ fluence local logs
```

_See code: [src/commands/local/logs.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/local/logs.ts)_

## `fluence local ps`

List containers using docker compose

```
USAGE
  $ fluence local ps [--no-input] [--flags <value>]

FLAGS
  --flags=<--flag arg>  Space separated flags to pass to `docker compose`
  --no-input            Don't interactively ask for any input from the user

DESCRIPTION
  List containers using docker compose

EXAMPLES
  $ fluence local ps
```

_See code: [src/commands/local/ps.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/local/ps.ts)_

## `fluence local up`

Run docker-compose.yaml using docker compose and set up provider using the first offer from the 'offers' section in provider.yaml file.

```
USAGE
  $ fluence local up [--no-input] [--noxes <value>] [--timeout <value>] [--priv-key <value>] [--quiet-pull]
    [-d] [--build] [--flags <value>] [-r]

FLAGS
  -d, --detach                  Detached mode: Run containers in the background
  -r, --[no-]reset              Resets docker-compose.yaml to default, removes volumes and previous local deployments
      --build                   Build images before starting containers
      --flags=<--flag arg>      Space separated flags to pass to `docker compose`
      --no-input                Don't interactively ask for any input from the user
      --noxes=<value>           Number of Compute Peers to generate when a new provider.yaml is created
      --priv-key=<private-key>  !WARNING! for debug purposes only. Passing private keys through flags is unsecure. On
                                local network 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key
                                will be used by default
      --quiet-pull              Pull without printing progress information
      --timeout=<value>         [default: 120] Timeout in seconds for attempting to register local network on local
                                peers

DESCRIPTION
  Run docker-compose.yaml using docker compose and set up provider using the first offer from the 'offers' section in
  provider.yaml file.

EXAMPLES
  $ fluence local up
```

_See code: [src/commands/local/up.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/local/up.ts)_

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

_See code: [src/commands/module/add.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/module/add.ts)_

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

_See code: [src/commands/module/new.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/module/new.ts)_

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

_See code: [src/commands/module/remove.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/module/remove.ts)_

## `fluence provider cc-activate`

Add FLT collateral to capacity commitment to activate it

```
USAGE
  $ fluence provider cc-activate [--no-input] [--env <value>] [--priv-key <value>] [--nox-names <value> | --ids <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --ids=<value>                         Comma separated capacity commitment IDs. Default: all noxes from
                                        capacityCommitments property of the provider config
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Add FLT collateral to capacity commitment to activate it

ALIASES
  $ fluence provider ca
```

_See code: [src/commands/provider/cc-activate.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/cc-activate.ts)_

## `fluence provider cc-create`

Create Capacity commitment

```
USAGE
  $ fluence provider cc-create [--no-input] [--env <value>] [--priv-key <value>] [--nox-names <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Create Capacity commitment

ALIASES
  $ fluence provider cc
```

_See code: [src/commands/provider/cc-create.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/cc-create.ts)_

## `fluence provider cc-info`

Get info about capacity commitments

```
USAGE
  $ fluence provider cc-info [--no-input] [--nox-names <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Get info about capacity commitments

ALIASES
  $ fluence provider ci
```

_See code: [src/commands/provider/cc-info.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/cc-info.ts)_

## `fluence provider cc-update`

Update Capacity commitment

```
USAGE
  $ fluence provider cc-update [--no-input] [--env <value>] [--priv-key <value>] [--nox-names <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Update Capacity commitment

ALIASES
  $ fluence provider cu
```

_See code: [src/commands/provider/cc-update.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/cc-update.ts)_

## `fluence provider cc-withdraw-collateral`

Withdraw FLT collateral from capacity commitments

```
USAGE
  $ fluence provider cc-withdraw-collateral [--no-input] [--nox-names <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Withdraw FLT collateral from capacity commitments

ALIASES
  $ fluence provider cwc
```

_See code: [src/commands/provider/cc-withdraw-collateral.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/cc-withdraw-collateral.ts)_

## `fluence provider cc-withdraw-rewards`

Withdraw FLT rewards from capacity commitments

```
USAGE
  $ fluence provider cc-withdraw-rewards [--no-input] [--nox-names <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Withdraw FLT rewards from capacity commitments

ALIASES
  $ fluence provider cwr
```

_See code: [src/commands/provider/cc-withdraw-rewards.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/cc-withdraw-rewards.ts)_

## `fluence provider deal-exit [DEAL-IDS]`

Exit from deal

```
USAGE
  $ fluence provider deal-exit [DEAL-IDS] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  DEAL-IDS  Comma-separated deal ids

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Exit from deal

ALIASES
  $ fluence provider de
```

_See code: [src/commands/provider/deal-exit.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/deal-exit.ts)_

## `fluence provider deal-list`

List deals

```
USAGE
  $ fluence provider deal-list [--no-input] [--env <value>] [--priv-key <value>] [--nox-names <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  List deals

ALIASES
  $ fluence provider dl
```

_See code: [src/commands/provider/deal-list.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/deal-list.ts)_

## `fluence provider deal-reward-info [DEAL-ADDRESS] [UNIT-ID]`

Deal reward info

```
USAGE
  $ fluence provider deal-reward-info [DEAL-ADDRESS] [UNIT-ID] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  DEAL-ADDRESS  Deal address
  UNIT-ID       Compute unit ID

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Deal reward info

ALIASES
  $ fluence provider dri
```

_See code: [src/commands/provider/deal-reward-info.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/deal-reward-info.ts)_

## `fluence provider deal-withdraw [DEAL-IDS]`

Withdraw USDC rewards from deals

```
USAGE
  $ fluence provider deal-withdraw [DEAL-IDS] [--no-input] [--env <value>] [--priv-key <value>]

ARGUMENTS
  DEAL-IDS  Deal ids

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Withdraw USDC rewards from deals

ALIASES
  $ fluence provider dw
```

_See code: [src/commands/provider/deal-withdraw.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/deal-withdraw.ts)_

## `fluence provider gen`

Generate Config.toml files according to provider.yaml and secrets according to provider-secrets.yaml

```
USAGE
  $ fluence provider gen [--no-input] [--noxes <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --noxes=<value>                       Number of Compute Peers to generate when a new provider.yaml is created
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Generate Config.toml files according to provider.yaml and secrets according to provider-secrets.yaml

EXAMPLES
  $ fluence provider gen
```

_See code: [src/commands/provider/gen.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/gen.ts)_

## `fluence provider init`

Init provider config. Creates a provider.yaml file

```
USAGE
  $ fluence provider init [--no-input] [--noxes <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --noxes=<value>                       Number of Compute Peers to generate when a new provider.yaml is created
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Init provider config. Creates a provider.yaml file
```

_See code: [src/commands/provider/init.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/init.ts)_

## `fluence provider offer-create`

Create offers. You have to be registered as a provider to do that

```
USAGE
  $ fluence provider offer-create [--no-input] [--env <value>] [--priv-key <value>] [--offer <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --offer=<offer-1,offer-2>             Comma-separated list of offer names. Can't be used together with --offer-ids. To
                                        use all of your offers: --offer all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Create offers. You have to be registered as a provider to do that

ALIASES
  $ fluence provider oc
```

_See code: [src/commands/provider/offer-create.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/offer-create.ts)_

## `fluence provider offer-info`

Get info about offers

```
USAGE
  $ fluence provider offer-info [--no-input] [--offer <value> | --offer-ids <value>] [--env <value>] [--priv-key
  <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --offer=<offer-1,offer-2>             Comma-separated list of offer names. Can't be used together with --offer-ids. To
                                        use all of your offers: --offer all
  --offer-ids=<id-1,id-2>               Comma-separated list of offer ids. Can't be used together with --offer flag
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Get info about offers

ALIASES
  $ fluence provider oi
```

_See code: [src/commands/provider/offer-info.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/offer-info.ts)_

## `fluence provider offer-update`

Update offers

```
USAGE
  $ fluence provider offer-update [--no-input] [--offer <value>] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --offer=<offer-1,offer-2>             Comma-separated list of offer names. Can't be used together with --offer-ids. To
                                        use all of your offers: --offer all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Update offers

ALIASES
  $ fluence provider ou
```

_See code: [src/commands/provider/offer-update.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/offer-update.ts)_

## `fluence provider register`

Register as a provider

```
USAGE
  $ fluence provider register [--no-input] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Register as a provider

ALIASES
  $ fluence provider r
```

_See code: [src/commands/provider/register.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/register.ts)_

## `fluence provider signing-wallets`

Print nox signing wallets

```
USAGE
  $ fluence provider signing-wallets [--no-input] [--env <value>] [--priv-key <value>] [--nox-names <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Print nox signing wallets

ALIASES
  $ fluence provider sw
```

_See code: [src/commands/provider/signing-wallets.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/signing-wallets.ts)_

## `fluence provider tokens-distribute`

Distribute FLT tokens to noxes

```
USAGE
  $ fluence provider tokens-distribute [--no-input] [--env <value>] [--priv-key <value>] [--nox-names <value>] [--amount
  <value>]

FLAGS
  --amount=<value>                      Amount of FLT tokens to distribute to noxes
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>             Comma-separated names of noxes from provider.yaml. To use all of your noxes:
                                        --nox-names all
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Distribute FLT tokens to noxes

ALIASES
  $ fluence provider td
```

_See code: [src/commands/provider/tokens-distribute.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/tokens-distribute.ts)_

## `fluence provider update`

Update provider info

```
USAGE
  $ fluence provider update [--no-input] [--env <value>] [--priv-key <value>]

FLAGS
  --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
  --no-input                            Don't interactively ask for any input from the user
  --priv-key=<private-key>              !WARNING! for debug purposes only. Passing private keys through flags is
                                        unsecure. On local network
                                        0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 key will be
                                        used by default

DESCRIPTION
  Update provider info

ALIASES
  $ fluence provider u
```

_See code: [src/commands/provider/update.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/provider/update.ts)_

## `fluence run`

Run the first aqua function CLI is able to find and compile among all aqua files specified in 'compileAqua' property of fluence.yaml file. If --input flag is used - then content of 'compileAqua' property in fluence.yaml will be ignored

```
USAGE
  $ fluence run [--no-input] [--data <value>] [--data-path <value>] [--quiet] [-f <value>] [--print-air |
    -b] [--off-aqua-logs] [-k <value>] [--relay <value>] [--ttl <value>] [--dial-timeout <value>] [--particle-id] [--env
    <value>] [--import <value>] [-i <value>] [--const <value>] [--log-level-compiler <value>] [--no-relay] [--no-xor]
    [--tracing] [--no-empty-response]

FLAGS
  -b, --print-beautified-air                Prints beautified AIR code instead of function execution
  -f, --func=<function-call>                Function call. Example: funcName("stringArg")
  -i, --input=<path>                        Path to an aqua file or a directory that contains your aqua files
  -k, --sk=<name>                           Name of the secret key for js-client inside CLI to use. If not specified,
                                            will use the default key for the project. If there is no fluence project or
                                            there is no default key, will use user's default key
      --const=<NAME=value>...               Constants to be passed to the compiler
      --data=<json>                         JSON in { [argumentName]: argumentValue } format. You can call a function
                                            using these argument names like this: -f 'myFunc(argumentName)'. Arguments
                                            in this flag override arguments in the --data-path flag
      --data-path=<path>                    Path to a JSON file in { [argumentName]: argumentValue } format. You can
                                            call a function using these argument names like this: -f
                                            'myFunc(argumentName)'. Arguments in this flag can be overridden using
                                            --data flag
      --dial-timeout=<milliseconds>         [default: 15000] Timeout for Fluence js-client to connect to relay peer
      --env=<dar | stage | local | custom>  Fluence Environment to use when running the command
      --import=<path>...                    Path to a directory to import aqua files from. May be used several times
      --log-level-compiler=<level>          Set log level for the compiler. Must be one of: all, trace, debug, info,
                                            warn, error, off
      --no-empty-response                   Do not generate response call if there are no returned values
      --no-input                            Don't interactively ask for any input from the user
      --no-relay                            Do not generate a pass through the relay node
      --no-xor                              Do not generate a wrapper that catches and displays errors
      --off-aqua-logs                       Turns off logs from Console.print in aqua and from IPFS service
      --particle-id                         Print particle ids when running Fluence js-client
      --print-air                           Prints generated AIR code instead of function execution
      --quiet                               Print only execution result. Overrides all --log-level-* flags
      --relay=<multiaddress>                Relay for Fluence js-client to connect to
      --tracing                             Compile aqua in tracing mode (for debugging purposes)
      --ttl=<milliseconds>                  [default: 15000] Particle Time To Live since 'now'. After that, particle is
                                            expired and not processed.

DESCRIPTION
  Run the first aqua function CLI is able to find and compile among all aqua files specified in 'compileAqua' property
  of fluence.yaml file. If --input flag is used - then content of 'compileAqua' property in fluence.yaml will be ignored

EXAMPLES
  $ fluence run -f 'funcName("stringArg")'
```

_See code: [src/commands/run.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/run.ts)_

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

_See code: [src/commands/service/add.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/service/add.ts)_

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

_See code: [src/commands/service/new.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/service/new.ts)_

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

_See code: [src/commands/service/remove.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/service/remove.ts)_

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

_See code: [src/commands/service/repl.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/service/repl.ts)_

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

_See code: [src/commands/spell/build.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/spell/build.ts)_

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

_See code: [src/commands/spell/new.ts](https://github.com/fluencelabs/cli/blob/v0.15.12/src/commands/spell/new.ts)_

## `fluence update [CHANNEL]`

update the fluence CLI

```
USAGE
  $ fluence update [CHANNEL] [-a] [--force] [-i | -v <value>]

FLAGS
  -a, --available        See available versions.
  -i, --interactive      Interactively select version to install. This is ignored if a channel is provided.
  -v, --version=<value>  Install a specific version.
      --force            Force a re-download of the requested version.

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

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.1.7/src/commands/update.ts)_
<!-- commandsstop -->
