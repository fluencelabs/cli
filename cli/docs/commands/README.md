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
* [`fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID]`](#fluence-deal-change-app-deal-address-new-app-cid)
* [`fluence deal create`](#fluence-deal-create)
* [`fluence deal deposit [AMOUNT] [DEPLOYMENT-NAMES]`](#fluence-deal-deposit-amount-deployment-names)
* [`fluence deal info [DEPLOYMENT-NAMES]`](#fluence-deal-info-deployment-names)
* [`fluence deal logs [DEPLOYMENT-NAMES]`](#fluence-deal-logs-deployment-names)
* [`fluence deal stop [DEPLOYMENT-NAMES]`](#fluence-deal-stop-deployment-names)
* [`fluence deal withdraw [AMOUNT] [DEPLOYMENT-NAMES]`](#fluence-deal-withdraw-amount-deployment-names)
* [`fluence deal workers-add [DEPLOYMENT-NAMES]`](#fluence-deal-workers-add-deployment-names)
* [`fluence deal workers-remove [WORKER-IDS]`](#fluence-deal-workers-remove-worker-ids)
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
* [`fluence help [COMMAND]`](#fluence-help-command)
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
* [`fluence module build [PATH]`](#fluence-module-build-path)
* [`fluence module new [NAME]`](#fluence-module-new-name)
* [`fluence module pack [PATH]`](#fluence-module-pack-path)
* [`fluence module remove [NAME | PATH | URL]`](#fluence-module-remove-name--path--url)
* [`fluence provider cc-activate`](#fluence-provider-cc-activate)
* [`fluence provider cc-create`](#fluence-provider-cc-create)
* [`fluence provider cc-finish`](#fluence-provider-cc-finish)
* [`fluence provider cc-info`](#fluence-provider-cc-info)
* [`fluence provider cc-remove`](#fluence-provider-cc-remove)
* [`fluence provider cc-rewards-withdraw`](#fluence-provider-cc-rewards-withdraw)
* [`fluence provider deal-exit`](#fluence-provider-deal-exit)
* [`fluence provider deal-list`](#fluence-provider-deal-list)
* [`fluence provider deal-rewards-info [DEAL-ADDRESS] [ON-CHAIN-WORKER-ID]`](#fluence-provider-deal-rewards-info-deal-address-on-chain-worker-id)
* [`fluence provider deal-rewards-withdraw`](#fluence-provider-deal-rewards-withdraw)
* [`fluence provider gen`](#fluence-provider-gen)
* [`fluence provider info`](#fluence-provider-info)
* [`fluence provider init`](#fluence-provider-init)
* [`fluence provider offer-create`](#fluence-provider-offer-create)
* [`fluence provider offer-info`](#fluence-provider-offer-info)
* [`fluence provider offer-remove`](#fluence-provider-offer-remove)
* [`fluence provider offer-update`](#fluence-provider-offer-update)
* [`fluence provider register`](#fluence-provider-register)
* [`fluence provider tokens-distribute`](#fluence-provider-tokens-distribute)
* [`fluence provider tokens-withdraw`](#fluence-provider-tokens-withdraw)
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

_See code: [src/commands/air/beautify.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/air/beautify.ts)_

## `fluence aqua`

Compile aqua defined in 'compileAqua' property of fluence.yaml. If --input flag is used - then content of 'compileAqua' property in fluence.yaml will be ignored

```
USAGE
  $ fluence aqua [-n <value>] [--no-input] [-w] [-o <path>] [--air | --js] [--import <path>...] [-i
    <path>] [--const <NAME=value>...] [--log-level-compiler <level>] [--no-relay] [--no-xor] [--tracing]
    [--no-empty-response] [--dry]

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

_See code: [src/commands/aqua.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/aqua.ts)_

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

_See code: [src/commands/aqua/imports.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/aqua/imports.ts)_

## `fluence aqua json [INPUT] [OUTPUT]`

Infers aqua types for an arbitrary json file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the json file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into

```
USAGE
  $ fluence aqua json [INPUT] [OUTPUT] [--no-input] [--f64] [--types <path>]

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

_See code: [src/commands/aqua/json.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/aqua/json.ts)_

## `fluence aqua yml [INPUT] [OUTPUT]`

Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into

```
USAGE
  $ fluence aqua yml [INPUT] [OUTPUT] [--no-input] [--f64] [--types <path>]

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

_See code: [src/commands/aqua/yml.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/aqua/yml.ts)_

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

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.0.17/src/commands/autocomplete/index.ts)_

## `fluence build`

Build all application services, described in fluence.yaml and generate aqua interfaces for them

```
USAGE
  $ fluence build [--no-input] [--marine-build-args <--flag arg>] [--import <path>...] [--env <testnet |
    mainnet | stage | local>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --import=<path>...                         Path to a directory to import aqua files from. May be used several times
  --marine-build-args=<--flag arg>           Space separated `cargo build` flags and args to pass to marine build.
                                             Overrides 'marineBuildArgs' property in fluence.yaml. Default: --release
  --no-input                                 Don't interactively ask for any input from the user

DESCRIPTION
  Build all application services, described in fluence.yaml and generate aqua interfaces for them

EXAMPLES
  $ fluence build
```

_See code: [src/commands/build.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/build.ts)_

## `fluence chain info`

Show contract addresses for the fluence environment and accounts for the local environment

```
USAGE
  $ fluence chain info [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Show contract addresses for the fluence environment and accounts for the local environment
```

_See code: [src/commands/chain/info.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/chain/info.ts)_

## `fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID]`

Change app id in the deal

```
USAGE
  $ fluence deal change-app [DEAL-ADDRESS] [NEW-APP-CID] [--no-input] [--env <testnet | mainnet | stage | local>]
    [--priv-key <private-key>]

ARGUMENTS
  DEAL-ADDRESS  Deal address
  NEW-APP-CID   New app CID for the deal

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Change app id in the deal
```

_See code: [src/commands/deal/change-app.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/change-app.ts)_

## `fluence deal create`

Create your deal with the specified parameters

```
USAGE
  $ fluence deal create --app-cid <value> --collateral-per-worker <value> --min-workers <value> --target-workers
    <value> --max-workers-per-provider <value> --price-per-cu-per-epoch <value> --cu-count-per-worker <value>
    [--no-input] [--initial-balance <value>] [--effectors <value>] [--whitelist <value> | --blacklist <value>]
    [--protocol-version <value>] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --app-cid=<value>                          (required) CID of the application that will be deployed
  --blacklist=<value>                        Comma-separated list of blacklisted providers
  --collateral-per-worker=<value>            (required) Collateral per worker
  --cu-count-per-worker=<value>              (required) Compute unit count per worker
  --effectors=<value>                        Comma-separated list of effector to be used in the deal
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --initial-balance=<value>                  Initial balance
  --max-workers-per-provider=<value>         (required) Max workers per provider
  --min-workers=<value>                      (required) Required workers to activate the deal
  --no-input                                 Don't interactively ask for any input from the user
  --price-per-cu-per-epoch=<value>           (required) Price per CU per epoch
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode
  --protocol-version=<value>                 Protocol version
  --target-workers=<value>                   (required) Max workers in the deal
  --whitelist=<value>                        Comma-separated list of whitelisted providers

DESCRIPTION
  Create your deal with the specified parameters
```

_See code: [src/commands/deal/create.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/create.ts)_

## `fluence deal deposit [AMOUNT] [DEPLOYMENT-NAMES]`

Deposit do the deal

```
USAGE
  $ fluence deal deposit [AMOUNT] [DEPLOYMENT-NAMES] [--no-input] [--env <testnet | mainnet | stage | local>]
    [--priv-key <private-key>] [--deal-ids <id-1,id-2>]

ARGUMENTS
  AMOUNT            Amount of USDC tokens to deposit
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Deposit do the deal
```

_See code: [src/commands/deal/deposit.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/deposit.ts)_

## `fluence deal info [DEPLOYMENT-NAMES]`

Get info about the deal

```
USAGE
  $ fluence deal info [DEPLOYMENT-NAMES] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
    <private-key>] [--deal-ids <id-1,id-2>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Get info about the deal
```

_See code: [src/commands/deal/info.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/info.ts)_

## `fluence deal logs [DEPLOYMENT-NAMES]`

Get logs from deployed workers for deals listed in workers.yaml

```
USAGE
  $ fluence deal logs [DEPLOYMENT-NAMES] [--no-input] [-k <name>] [--relay <multiaddress>] [--ttl
    <milliseconds>] [--dial-timeout <milliseconds>] [--particle-id] [--env <testnet | mainnet | stage | local>]
    [--off-aqua-logs] [--tracing] [--deal-ids <id-1,id-2>] [--spell <spell-name>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  -k, --sk=<name>                                Name of the secret key for js-client inside CLI to use. If not
                                                 specified, will use the default key for the project. If there is no
                                                 fluence project or there is no default key, will use user's default key
      --deal-ids=<id-1,id-2>                     Comma-separated deal ids
      --dial-timeout=<milliseconds>              [default: 15000] Timeout for Fluence js-client to connect to relay peer
      --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
      --no-input                                 Don't interactively ask for any input from the user
      --off-aqua-logs                            Turns off logs from Console.print in aqua and from IPFS service
      --particle-id                              Print particle ids when running Fluence js-client
      --relay=<multiaddress>                     Relay for Fluence js-client to connect to
      --spell=<spell-name>                       [default: worker-spell] Spell name to get logs for
      --tracing                                  Compile aqua in tracing mode (for debugging purposes)
      --ttl=<milliseconds>                       [default: 15000] Particle Time To Live since 'now'. After that,
                                                 particle is expired and not processed.

DESCRIPTION
  Get logs from deployed workers for deals listed in workers.yaml

EXAMPLES
  $ fluence deal logs
```

_See code: [src/commands/deal/logs.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/logs.ts)_

## `fluence deal stop [DEPLOYMENT-NAMES]`

Stop the deal

```
USAGE
  $ fluence deal stop [DEPLOYMENT-NAMES] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
    <private-key>] [--deal-ids <id-1,id-2>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Stop the deal
```

_See code: [src/commands/deal/stop.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/stop.ts)_

## `fluence deal withdraw [AMOUNT] [DEPLOYMENT-NAMES]`

Withdraw tokens from the deal

```
USAGE
  $ fluence deal withdraw [AMOUNT] [DEPLOYMENT-NAMES] [--no-input] [--env <testnet | mainnet | stage | local>]
    [--priv-key <private-key>] [--deal-ids <id-1,id-2>]

ARGUMENTS
  AMOUNT            Amount of USDC tokens to withdraw
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Withdraw tokens from the deal
```

_See code: [src/commands/deal/withdraw.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/withdraw.ts)_

## `fluence deal workers-add [DEPLOYMENT-NAMES]`

Add missing workers to the deal

```
USAGE
  $ fluence deal workers-add [DEPLOYMENT-NAMES] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
    <private-key>] [--deal-ids <id-1,id-2>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Add missing workers to the deal

ALIASES
  $ fluence deal wa
```

_See code: [src/commands/deal/workers-add.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/workers-add.ts)_

## `fluence deal workers-remove [WORKER-IDS]`

Remove unit from the deal

```
USAGE
  $ fluence deal workers-remove [WORKER-IDS] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
    <private-key>] [--deal-id <value>] [--name <value>]

ARGUMENTS
  WORKER-IDS  Comma-separated compute unit ids. You can get them using 'fluence deal info' command

FLAGS
  --deal-id=<value>                          Deal id. You can get it using 'fluence deal info' command
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --name=<value>                             Name of the deployment from workers.yaml
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Remove unit from the deal

ALIASES
  $ fluence deal wr
```

_See code: [src/commands/deal/workers-remove.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deal/workers-remove.ts)_

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

_See code: [src/commands/default/env.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/default/env.ts)_

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

_See code: [src/commands/default/peers.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/default/peers.ts)_

## `fluence delegator collateral-add [IDS]`

Add FLT collateral to capacity commitment

```
USAGE
  $ fluence delegator collateral-add [IDS] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
  <private-key>]

ARGUMENTS
  IDS  Comma separated capacity commitment IDs

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Add FLT collateral to capacity commitment

ALIASES
  $ fluence delegator ca
```

_See code: [src/commands/delegator/collateral-add.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/delegator/collateral-add.ts)_

## `fluence delegator collateral-withdraw [IDS]`

Withdraw FLT collateral from capacity commitment

```
USAGE
  $ fluence delegator collateral-withdraw [IDS] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--finish]

ARGUMENTS
  IDS  Comma separated capacity commitment IDs

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --finish                                   Finish capacity commitment after collateral withdrawal
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Withdraw FLT collateral from capacity commitment

ALIASES
  $ fluence delegator cw
```

_See code: [src/commands/delegator/collateral-withdraw.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/delegator/collateral-withdraw.ts)_

## `fluence delegator reward-withdraw [IDS]`

Withdraw FLT rewards from capacity commitment

```
USAGE
  $ fluence delegator reward-withdraw [IDS] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
  <private-key>]

ARGUMENTS
  IDS  Comma separated capacity commitment IDs

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Withdraw FLT rewards from capacity commitment

ALIASES
  $ fluence delegator rw
```

_See code: [src/commands/delegator/reward-withdraw.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/delegator/reward-withdraw.ts)_

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

_See code: [src/commands/dep/install.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/dep/install.ts)_

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

_See code: [src/commands/dep/reset.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/dep/reset.ts)_

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

_See code: [src/commands/dep/uninstall.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/dep/uninstall.ts)_

## `fluence dep versions`

Get versions of all cli dependencies, including aqua, marine, mrepl and internal

```
USAGE
  $ fluence dep versions [--no-input] [--default] [--json]

FLAGS
  --default   Display default npm and cargo dependencies and their versions for current CLI version. Default npm
              dependencies are always available to be imported in Aqua
  --json      Output JSON
  --no-input  Don't interactively ask for any input from the user

DESCRIPTION
  Get versions of all cli dependencies, including aqua, marine, mrepl and internal

ALIASES
  $ fluence dep v

EXAMPLES
  $ fluence dep versions
```

_See code: [src/commands/dep/versions.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/dep/versions.ts)_

## `fluence deploy [DEPLOYMENT-NAMES]`

Deploy according to 'deployments' property in fluence.yaml

```
USAGE
  $ fluence deploy [DEPLOYMENT-NAMES] [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key
    <private-key>] [--import <path>...] [--no-build] [--marine-build-args <--flag arg>] [-u] [--peer-ids <value>]

ARGUMENTS
  DEPLOYMENT-NAMES  Comma separated names of deployments. Can't be used together with --deal-ids flag

FLAGS
  -u, --update                                   Update your previous deployment
      --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
      --import=<path>...                         Path to a directory to import aqua files from. May be used several
                                                 times
      --marine-build-args=<--flag arg>           Space separated `cargo build` flags and args to pass to marine build.
                                                 Overrides 'marineBuildArgs' property in fluence.yaml. Default:
                                                 --release
      --no-build                                 Don't build the project before running the command
      --no-input                                 Don't interactively ask for any input from the user
      --peer-ids=<value>                         Comma separated list of peer ids to deploy to. Creates 1 worker for
                                                 each peer with 'cuCountPerWorker' number of compute units
      --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags
                                                 is unsecure. On local env
                                                 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is
                                                 used by default when CLI is used in non-interactive mode

DESCRIPTION
  Deploy according to 'deployments' property in fluence.yaml

EXAMPLES
  $ fluence deploy
```

_See code: [src/commands/deploy.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/deploy.ts)_

## `fluence help [COMMAND]`

Display help for fluence.

```
USAGE
  $ fluence help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for fluence.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.21/src/commands/help.ts)_

## `fluence init [PATH]`

Initialize fluence project

```
USAGE
  $ fluence init [PATH] [--no-input] [-t <value>] [--env <testnet | mainnet | stage | local>] [--noxes
    <value>]

ARGUMENTS
  PATH  Project path

FLAGS
  -t, --template=<value>                         Template to use for the project. One of: quickstart, minimal, ts, js
      --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
      --no-input                                 Don't interactively ask for any input from the user
      --noxes=<value>                            Number of Compute Peers to generate when a new provider.yaml is created

DESCRIPTION
  Initialize fluence project

EXAMPLES
  $ fluence init
```

_See code: [src/commands/init.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/init.ts)_

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

_See code: [src/commands/key/default.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/key/default.ts)_

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

_See code: [src/commands/key/new.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/key/new.ts)_

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

_See code: [src/commands/key/remove.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/key/remove.ts)_

## `fluence local down`

Stop and remove currently running docker-compose.yaml using docker compose

```
USAGE
  $ fluence local down [--no-input] [-v] [--flags <--flag arg>]

FLAGS
  -v, --volumes             Remove named volumes declared in the "volumes" section of the Compose file and anonymous
                            volumes attached to containers
      --flags=<--flag arg>  Space separated flags to pass to `docker compose`
      --no-input            Don't interactively ask for any input from the user

DESCRIPTION
  Stop and remove currently running docker-compose.yaml using docker compose

EXAMPLES
  $ fluence local down
```

_See code: [src/commands/local/down.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/local/down.ts)_

## `fluence local init`

Init docker-compose.yaml according to provider.yaml

```
USAGE
  $ fluence local init [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Init docker-compose.yaml according to provider.yaml

EXAMPLES
  $ fluence local init
```

_See code: [src/commands/local/init.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/local/init.ts)_

## `fluence local logs`

Display docker-compose.yaml logs

```
USAGE
  $ fluence local logs [--no-input] [--flags <--flag arg>]

FLAGS
  --flags=<--flag arg>  Space separated flags to pass to `docker compose`
  --no-input            Don't interactively ask for any input from the user

DESCRIPTION
  Display docker-compose.yaml logs

EXAMPLES
  $ fluence local logs
```

_See code: [src/commands/local/logs.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/local/logs.ts)_

## `fluence local ps`

List containers using docker compose

```
USAGE
  $ fluence local ps [--no-input] [--flags <--flag arg>]

FLAGS
  --flags=<--flag arg>  Space separated flags to pass to `docker compose`
  --no-input            Don't interactively ask for any input from the user

DESCRIPTION
  List containers using docker compose

EXAMPLES
  $ fluence local ps
```

_See code: [src/commands/local/ps.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/local/ps.ts)_

## `fluence local up`

Run docker-compose.yaml using docker compose and set up provider using all the offers from the 'offers' section in provider.yaml config using default wallet key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

```
USAGE
  $ fluence local up [--no-input] [--noxes <value>] [--timeout <value>] [--priv-key <private-key>]
    [--quiet-pull] [-d] [--build] [--flags <--flag arg>] [-r] [--no-wait] [--no-set-up]

FLAGS
  -d, --detach                  Detached mode: Run containers in the background
  -r, --no-reset                Don't reset docker-compose.yaml to default, don't remove volumes and previous local
                                deployments
      --build                   Build images before starting containers
      --flags=<--flag arg>      Space separated flags to pass to `docker compose`
      --no-input                Don't interactively ask for any input from the user
      --no-set-up               Don't set up provider, offer, commitments and deposit collateral, so there will be no
                                active offer on the network after command is finished
      --no-wait                 Don't wait for services to be running|healthy
      --noxes=<value>           Number of Compute Peers to generate when a new provider.yaml is created
      --priv-key=<private-key>  !WARNING! for debug purposes only. Passing private keys through flags is unsecure. On
                                local env 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used by
                                default when CLI is used in non-interactive mode
      --quiet-pull              Pull without printing progress information
      --timeout=<value>         [default: 120] Timeout in seconds for attempting to register local network on local
                                peers

DESCRIPTION
  Run docker-compose.yaml using docker compose and set up provider using all the offers from the 'offers' section in
  provider.yaml config using default wallet key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

EXAMPLES
  $ fluence local up
```

_See code: [src/commands/local/up.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/local/up.ts)_

## `fluence module add [PATH | URL]`

Add module to service.yaml

```
USAGE
  $ fluence module add [PATH | URL] [--no-input] [--name <name>] [--service <name | path>]

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

_See code: [src/commands/module/add.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/module/add.ts)_

## `fluence module build [PATH]`

Build module

```
USAGE
  $ fluence module build [PATH] [--no-input] [--marine-build-args <--flag arg>]

ARGUMENTS
  PATH  Path to a module

FLAGS
  --marine-build-args=<--flag arg>  Space separated `cargo build` flags and args to pass to marine build. Overrides
                                    'marineBuildArgs' property in fluence.yaml. Default: --release
  --no-input                        Don't interactively ask for any input from the user

DESCRIPTION
  Build module

EXAMPLES
  $ fluence module build
```

_See code: [src/commands/module/build.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/module/build.ts)_

## `fluence module new [NAME]`

Create new marine module template

```
USAGE
  $ fluence module new [NAME] [--no-input] [--path <path>] [--service <name | relative_path>]

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

_See code: [src/commands/module/new.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/module/new.ts)_

## `fluence module pack [PATH]`

Pack module into tar.gz archive

```
USAGE
  $ fluence module pack [PATH] [--no-input] [--marine-build-args <--flag arg>] [-d <value>] [-b <value>]

ARGUMENTS
  PATH  Path to a module

FLAGS
  -b, --binding-crate=<value>           Path to a directory with rust binding crate
  -d, --destination=<value>             Path to a directory where you want archive to be saved. Default: current
                                        directory
      --marine-build-args=<--flag arg>  Space separated `cargo build` flags and args to pass to marine build. Overrides
                                        'marineBuildArgs' property in fluence.yaml. Default: --release
      --no-input                        Don't interactively ask for any input from the user

DESCRIPTION
  Pack module into tar.gz archive

EXAMPLES
  $ fluence module pack
```

_See code: [src/commands/module/pack.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/module/pack.ts)_

## `fluence module remove [NAME | PATH | URL]`

Remove module from service.yaml

```
USAGE
  $ fluence module remove [NAME | PATH | URL] [--no-input] [--service <name | path>]

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

_See code: [src/commands/module/remove.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/module/remove.ts)_

## `fluence provider cc-activate`

Add FLT collateral to capacity commitment to activate it

```
USAGE
  $ fluence provider cc-activate [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2> | --cc-ids <value>] [--offers <offer-1,offer-2>]

FLAGS
  --cc-ids=<value>                           Comma separated capacity commitment IDs
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Add FLT collateral to capacity commitment to activate it

ALIASES
  $ fluence provider ca
```

_See code: [src/commands/provider/cc-activate.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/cc-activate.ts)_

## `fluence provider cc-create`

Create Capacity commitment

```
USAGE
  $ fluence provider cc-create [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2>] [--offers <offer-1,offer-2>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Create Capacity commitment

ALIASES
  $ fluence provider cc
```

_See code: [src/commands/provider/cc-create.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/cc-create.ts)_

## `fluence provider cc-finish`

Move resources from deals, withdraw FLT collateral from capacity commitments, remove compute units from capacity commitments and finish capacity commitments

```
USAGE
  $ fluence provider cc-finish [--no-input] [--nox-names <nox-1,nox-2> | --cc-ids <value>] [--offers <offer-1,offer-2>]
    [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --cc-ids=<value>                           Comma separated capacity commitment IDs
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Move resources from deals, withdraw FLT collateral from capacity commitments, remove compute units from capacity
  commitments and finish capacity commitments

ALIASES
  $ fluence provider ccf
```

_See code: [src/commands/provider/cc-finish.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/cc-finish.ts)_

## `fluence provider cc-info`

Get info about capacity commitments

```
USAGE
  $ fluence provider cc-info [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2> | --cc-ids <value>] [--offers <offer-1,offer-2>] [--json]

FLAGS
  --cc-ids=<value>                           Comma separated capacity commitment IDs
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --json                                     Output JSON
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Get info about capacity commitments

ALIASES
  $ fluence provider ci
```

_See code: [src/commands/provider/cc-info.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/cc-info.ts)_

## `fluence provider cc-remove`

Remove Capacity commitment. You can remove it only BEFORE you activated it by depositing collateral

```
USAGE
  $ fluence provider cc-remove [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2> | --cc-ids <value>] [--offers <offer-1,offer-2>]

FLAGS
  --cc-ids=<value>                           Comma separated capacity commitment IDs
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Remove Capacity commitment. You can remove it only BEFORE you activated it by depositing collateral

ALIASES
  $ fluence provider cr
```

_See code: [src/commands/provider/cc-remove.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/cc-remove.ts)_

## `fluence provider cc-rewards-withdraw`

Withdraw FLT rewards from capacity commitments

```
USAGE
  $ fluence provider cc-rewards-withdraw [--no-input] [--nox-names <nox-1,nox-2> | --cc-ids <value>] [--offers <offer-1,offer-2>]
    [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --cc-ids=<value>                           Comma separated capacity commitment IDs
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Withdraw FLT rewards from capacity commitments

ALIASES
  $ fluence provider crw
```

_See code: [src/commands/provider/cc-rewards-withdraw.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/cc-rewards-withdraw.ts)_

## `fluence provider deal-exit`

Exit from deal

```
USAGE
  $ fluence provider deal-exit [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--deal-ids <id-1,id-2>] [--all]

FLAGS
  --all                                      To use all deal ids that indexer is aware of for your provider address
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Exit from deal

ALIASES
  $ fluence provider de
```

_See code: [src/commands/provider/deal-exit.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/deal-exit.ts)_

## `fluence provider deal-list`

List all deals

```
USAGE
  $ fluence provider deal-list [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  List all deals

ALIASES
  $ fluence provider dl
```

_See code: [src/commands/provider/deal-list.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/deal-list.ts)_

## `fluence provider deal-rewards-info [DEAL-ADDRESS] [ON-CHAIN-WORKER-ID]`

Deal rewards info

```
USAGE
  $ fluence provider deal-rewards-info [DEAL-ADDRESS] [ON-CHAIN-WORKER-ID] [--no-input] [--env <testnet | mainnet | stage |
    local>] [--priv-key <private-key>]

ARGUMENTS
  DEAL-ADDRESS        Deal address
  ON-CHAIN-WORKER-ID  On-chain worker id

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Deal rewards info

ALIASES
  $ fluence provider dri
```

_See code: [src/commands/provider/deal-rewards-info.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/deal-rewards-info.ts)_

## `fluence provider deal-rewards-withdraw`

Withdraw USDC rewards from deals

```
USAGE
  $ fluence provider deal-rewards-withdraw [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--deal-ids <id-1,id-2>]

FLAGS
  --deal-ids=<id-1,id-2>                     Comma-separated deal ids
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Withdraw USDC rewards from deals

ALIASES
  $ fluence provider drw
```

_See code: [src/commands/provider/deal-rewards-withdraw.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/deal-rewards-withdraw.ts)_

## `fluence provider gen`

Generate Config.toml files according to provider.yaml and secrets according to provider-secrets.yaml

```
USAGE
  $ fluence provider gen [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--reset-nox-secrets] [--no-withdraw]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --no-withdraw                              Is used only when --reset-nox-secrets flag is present. Will not withdraw
                                             tokens from noxes (if you don't need it or it fails for some reason)
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode
  --reset-nox-secrets                        Withdraw remaining tokens from your noxes, backup nox secrets from
                                             .fluence/provider-secrets.yaml and .fluence/secrets (if they exist) to
                                             .fluence/backups and generate new ones

DESCRIPTION
  Generate Config.toml files according to provider.yaml and secrets according to provider-secrets.yaml

EXAMPLES
  $ fluence provider gen
```

_See code: [src/commands/provider/gen.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/gen.ts)_

## `fluence provider info`

Print nox signing wallets and peer ids

```
USAGE
  $ fluence provider info [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2>] [--json] [--address <address>]

FLAGS
  --address=<address>                        Provider address
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --json                                     Output JSON
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Print nox signing wallets and peer ids

ALIASES
  $ fluence provider i
```

_See code: [src/commands/provider/info.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/info.ts)_

## `fluence provider init`

Init provider config. Creates a provider.yaml file

```
USAGE
  $ fluence provider init [--no-input] [--noxes <value>] [--env <testnet | mainnet | stage | local>] [--priv-key
    <private-key>] [--no-vm]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --no-vm                                    Generate provider.yaml without vm configuration
  --noxes=<value>                            Number of Compute Peers to generate when a new provider.yaml is created
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Init provider config. Creates a provider.yaml file
```

_See code: [src/commands/provider/init.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/init.ts)_

## `fluence provider offer-create`

Create offers. You have to be registered as a provider to do that

```
USAGE
  $ fluence provider offer-create [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--offers <offer-1,offer-2>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Create offers. You have to be registered as a provider to do that

ALIASES
  $ fluence provider oc
```

_See code: [src/commands/provider/offer-create.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/offer-create.ts)_

## `fluence provider offer-info`

Get info about offers

```
USAGE
  $ fluence provider offer-info [--no-input] [--offers <offer-1,offer-2> | --offer-ids <id-1,id-2>] [--env <testnet |
    mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --offer-ids=<id-1,id-2>                    Comma-separated list of offer ids. Can't be used together with --offers
                                             flag
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Get info about offers

ALIASES
  $ fluence provider oi
```

_See code: [src/commands/provider/offer-info.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/offer-info.ts)_

## `fluence provider offer-remove`

Remove offers

```
USAGE
  $ fluence provider offer-remove [--no-input] [--offers <offer-1,offer-2> | --offer-ids <id-1,id-2>] [--env <testnet |
    mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --offer-ids=<id-1,id-2>                    Comma-separated list of offer ids. Can't be used together with --offers
                                             flag
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Remove offers

ALIASES
  $ fluence provider or
```

_See code: [src/commands/provider/offer-remove.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/offer-remove.ts)_

## `fluence provider offer-update`

Update offers

```
USAGE
  $ fluence provider offer-update [--no-input] [--offers <offer-1,offer-2>] [--env <testnet | mainnet | stage | local>]
    [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Update offers

ALIASES
  $ fluence provider ou
```

_See code: [src/commands/provider/offer-update.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/offer-update.ts)_

## `fluence provider register`

Register as a provider

```
USAGE
  $ fluence provider register [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Register as a provider

ALIASES
  $ fluence provider r
```

_See code: [src/commands/provider/register.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/register.ts)_

## `fluence provider tokens-distribute`

Distribute FLT tokens to noxes

```
USAGE
  $ fluence provider tokens-distribute [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2>] [--offers <offer-1,offer-2>] [--amount <value>]

FLAGS
  --amount=<value>                           Amount of FLT tokens to distribute to noxes
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --offers=<offer-1,offer-2>                 Comma-separated list of offer names. To use all of your offers: --offers
                                             all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Distribute FLT tokens to noxes

ALIASES
  $ fluence provider td
```

_See code: [src/commands/provider/tokens-distribute.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/tokens-distribute.ts)_

## `fluence provider tokens-withdraw`

Withdraw FLT tokens from noxes

```
USAGE
  $ fluence provider tokens-withdraw [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]
    [--nox-names <nox-1,nox-2>] [--amount <value>]

FLAGS
  --amount=<value>                           Amount of FLT tokens to withdraw from noxes. Use --amount max to withdraw
                                             maximum possible amount
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --nox-names=<nox-1,nox-2>                  Comma-separated names of noxes from provider.yaml. To use all of your
                                             noxes: --nox-names all
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Withdraw FLT tokens from noxes

ALIASES
  $ fluence provider tw
```

_See code: [src/commands/provider/tokens-withdraw.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/tokens-withdraw.ts)_

## `fluence provider update`

Update provider info

```
USAGE
  $ fluence provider update [--no-input] [--env <testnet | mainnet | stage | local>] [--priv-key <private-key>]

FLAGS
  --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
  --no-input                                 Don't interactively ask for any input from the user
  --priv-key=<private-key>                   !WARNING! for debug purposes only. Passing private keys through flags is
                                             unsecure. On local env
                                             0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 is used
                                             by default when CLI is used in non-interactive mode

DESCRIPTION
  Update provider info

ALIASES
  $ fluence provider u
```

_See code: [src/commands/provider/update.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/provider/update.ts)_

## `fluence run`

Run the first aqua function CLI is able to find and compile among all aqua files specified in 'compileAqua' property of fluence.yaml file. If --input flag is used - then content of 'compileAqua' property in fluence.yaml will be ignored

```
USAGE
  $ fluence run [--no-input] [--data <json>] [--data-path <path>] [--quiet] [-f <function-call>]
    [--print-air | -b] [--off-aqua-logs] [-k <name>] [--relay <multiaddress>] [--ttl <milliseconds>] [--dial-timeout
    <milliseconds>] [--particle-id] [--env <testnet | mainnet | stage | local>] [--import <path>...] [-i <path>]
    [--const <NAME=value>...] [--log-level-compiler <level>] [--no-relay] [--no-xor] [--tracing] [--no-empty-response]

FLAGS
  -b, --print-beautified-air                     Prints beautified AIR code instead of function execution
  -f, --func=<function-call>                     Function call. Example: funcName("stringArg")
  -i, --input=<path>                             Path to an aqua file or a directory that contains your aqua files
  -k, --sk=<name>                                Name of the secret key for js-client inside CLI to use. If not
                                                 specified, will use the default key for the project. If there is no
                                                 fluence project or there is no default key, will use user's default key
      --const=<NAME=value>...                    Constants to be passed to the compiler
      --data=<json>                              JSON in { [argumentName]: argumentValue } format. You can call a
                                                 function using these argument names like this: -f
                                                 'myFunc(argumentName)'. Arguments in this flag override arguments in
                                                 the --data-path flag
      --data-path=<path>                         Path to a JSON file in { [argumentName]: argumentValue } format. You
                                                 can call a function using these argument names like this: -f
                                                 'myFunc(argumentName)'. Arguments in this flag can be overridden using
                                                 --data flag
      --dial-timeout=<milliseconds>              [default: 15000] Timeout for Fluence js-client to connect to relay peer
      --env=<testnet | mainnet | stage | local>  Fluence Environment to use when running the command
      --import=<path>...                         Path to a directory to import aqua files from. May be used several
                                                 times
      --log-level-compiler=<level>               Set log level for the compiler. Must be one of: all, trace, debug,
                                                 info, warn, error, off
      --no-empty-response                        Do not generate response call if there are no returned values
      --no-input                                 Don't interactively ask for any input from the user
      --no-relay                                 Do not generate a pass through the relay node
      --no-xor                                   Do not generate a wrapper that catches and displays errors
      --off-aqua-logs                            Turns off logs from Console.print in aqua and from IPFS service
      --particle-id                              Print particle ids when running Fluence js-client
      --print-air                                Prints generated AIR code instead of function execution
      --quiet                                    Print only execution result. Overrides all --log-level-* flags
      --relay=<multiaddress>                     Relay for Fluence js-client to connect to
      --tracing                                  Compile aqua in tracing mode (for debugging purposes)
      --ttl=<milliseconds>                       [default: 15000] Particle Time To Live since 'now'. After that,
                                                 particle is expired and not processed.

DESCRIPTION
  Run the first aqua function CLI is able to find and compile among all aqua files specified in 'compileAqua' property
  of fluence.yaml file. If --input flag is used - then content of 'compileAqua' property in fluence.yaml will be ignored

EXAMPLES
  $ fluence run -f 'funcName("stringArg")'
```

_See code: [src/commands/run.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/run.ts)_

## `fluence service add [PATH | URL]`

Add service to fluence.yaml

```
USAGE
  $ fluence service add [PATH | URL] [--no-input] [--name <name>] [--marine-build-args <--flag arg>]

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

_See code: [src/commands/service/add.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/service/add.ts)_

## `fluence service new [NAME]`

Create new marine service template

```
USAGE
  $ fluence service new [NAME] [--no-input] [--path <path>]

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

_See code: [src/commands/service/new.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/service/new.ts)_

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

_See code: [src/commands/service/remove.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/service/remove.ts)_

## `fluence service repl [NAME | PATH | URL]`

Open service inside repl (downloads and builds modules if necessary)

```
USAGE
  $ fluence service repl [NAME | PATH | URL] [--no-input] [--marine-build-args <--flag arg>]

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

_See code: [src/commands/service/repl.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/service/repl.ts)_

## `fluence spell build [SPELL-NAMES]`

Check spells aqua is able to compile without any errors

```
USAGE
  $ fluence spell build [SPELL-NAMES] [--no-input] [--import <path>...]

ARGUMENTS
  SPELL-NAMES  Comma separated names of spells to build. Example: "spell1,spell2" (by default all spells from 'spells'
               property in fluence.yaml will be built)

FLAGS
  --import=<path>...  Path to a directory to import aqua files from. May be used several times
  --no-input          Don't interactively ask for any input from the user

DESCRIPTION
  Check spells aqua is able to compile without any errors

EXAMPLES
  $ fluence spell build
```

_See code: [src/commands/spell/build.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/spell/build.ts)_

## `fluence spell new [NAME]`

Create a new spell template

```
USAGE
  $ fluence spell new [NAME] [--no-input] [--path <path>]

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

_See code: [src/commands/spell/new.ts](https://github.com/fluencelabs/cli/blob/fluence-cli-v0.22.0/src/commands/spell/new.ts)_

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

_See code: [@oclif/plugin-update](https://github.com/oclif/plugin-update/blob/v4.2.11/src/commands/update.ts)_
<!-- commandsstop -->
