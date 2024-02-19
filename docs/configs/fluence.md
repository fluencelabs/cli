# fluence.yaml

Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use `fluence init` command to generate a template for new Fluence project

## Properties

| Property               | Type                        | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                          |
|------------------------|-----------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `aquaDependencies`     | [object](#aquadependencies) | **Yes**  | A map of npm aqua dependency versions                                                                                                                                                                                                                                                                                                                                                                                                |
| `version`              | number                      | **Yes**  |                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `aquaImports`          | string[]                    | No       | A list of path to be considered by aqua compiler to be used as imports. First dependency in the list has the highest priority. Priority of imports is considered in the following order: imports from --import flags, imports from aquaImports property in fluence.yaml, project's .fluence/aqua dir, npm dependencies from fluence.yaml, npm dependencies from user's .fluence/config.yaml, npm dependencies recommended by fluence |
| `cliVersion`           | string                      | No       | The version of the Fluence CLI that is compatible with this project. Set this to enforce a particular set of versions of all fluence components                                                                                                                                                                                                                                                                                      |
| `compileAqua`          | [object](#compileaqua)      | No       | A map of aqua files to compile                                                                                                                                                                                                                                                                                                                                                                                                       |
| `customFluenceEnv`     | [object](#customfluenceenv) | No       | Custom Fluence environment to use when connecting to Fluence network                                                                                                                                                                                                                                                                                                                                                                 |
| `defaultSecretKeyName` | string                      | No       | Secret key with this name will be used by default by js-client inside CLI to run Aqua code                                                                                                                                                                                                                                                                                                                                           |
| `deployments`          | [object](#deployments)      | No       | A map with deployment names as keys and deployments as values                                                                                                                                                                                                                                                                                                                                                                        |
| `hosts`                | [object](#hosts)            | No       | A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on. Intended to be used by providers to deploy directly without using the blockchain                                                                                                                                                                                                                                           |
| `ipfsAddr`             | string                      | No       | IPFS multiaddress to use when uploading workers with 'deal deploy'. Default: /dns4/ipfs.fluence.dev/tcp/5001 or /ip4/127.0.0.1/tcp/5001 if using local local env (for 'workers deploy' IPFS address provided by relay that you are connected to is used)                                                                                                                                                                             |
| `marineBuildArgs`      | string                      | No       | Space separated `cargo build` flags and args to pass to marine build. Can be overridden using --marine-build-args flag Default: --release                                                                                                                                                                                                                                                                                            |
| `marineVersion`        | string                      | No       | Marine version                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `mreplVersion`         | string                      | No       | Mrepl version                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `relaysPath`           | string, array, or null      | No       | Single or multiple paths to the directories where you want relays.json file to be generated. Must be relative to the project root dir. This file contains a list of relays to use when connecting to Fluence network and depends on the default environment that you use in your project                                                                                                                                             |
| `services`             | [object](#services)         | No       | A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config                                                                                                                               |
| `spells`               | [object](#spells)           | No       | A map with spell names as keys and spell configs as values                                                                                                                                                                                                                                                                                                                                                                           |

## aquaDependencies

A map of npm aqua dependency versions

### Properties

| Property                   | Type   | Required | Description                                                                                                                     |
|----------------------------|--------|----------|---------------------------------------------------------------------------------------------------------------------------------|
| `npm-aqua-dependency-name` | string | No       | Valid npm dependency version specification (check out https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies) |

## compileAqua

A map of aqua files to compile

### Properties

| Property           | Type                        | Required | Description |
|--------------------|-----------------------------|----------|-------------|
| `aqua-config-name` | [object](#aqua-config-name) | No       |             |

### aqua-config-name

#### Properties

| Property          | Type                 | Required | Description                                                                                                             |
|-------------------|----------------------|----------|-------------------------------------------------------------------------------------------------------------------------|
| `input`           | string               | **Yes**  | Relative path to the aqua file or directory with aqua files                                                             |
| `output`          | string               | **Yes**  | Relative path to the output directory                                                                                   |
| `target`          | string               | **Yes**  | Compilation target Possible values are: `ts`, `js`, `air`.                                                              |
| `constants`       | [object](#constants) | No       | A list of constants to pass to the compiler. Constant name must be uppercase                                            |
| `logLevel`        | string               | No       | Log level for the compiler. Default: info Possible values are: `all`, `trace`, `debug`, `info`, `warn`, `error`, `off`. |
| `noEmptyResponse` | boolean              | No       | Do not generate response call if there are no returned values. Default: false                                           |
| `noRelay`         | boolean              | No       | Do not generate a pass through the relay node. Default: false                                                           |
| `noXor`           | boolean              | No       | Do not generate a wrapper that catches and displays errors. Default: false                                              |
| `tracing`         | boolean              | No       | Compile aqua in tracing mode (for debugging purposes). Default: false                                                   |

#### constants

A list of constants to pass to the compiler. Constant name must be uppercase

##### Properties

| Property        | Type                       | Required | Description |
|-----------------|----------------------------|----------|-------------|
| `SOME_CONSTANT` | string, number, or boolean | No       |             |

## customFluenceEnv

Custom Fluence environment to use when connecting to Fluence network

### Properties

| Property       | Type     | Required | Description                                                                                                                                         |
|----------------|----------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------|
| `contractsEnv` | string   | **Yes**  | Contracts environment to use for this fluence network to sign contracts on the blockchain Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `relays`       | string[] | **Yes**  | List of custom relay multiaddresses to use when connecting to Fluence network                                                                       |

## deployments

A map with deployment names as keys and deployments as values

### Properties

| Property         | Type                      | Required | Description       |
|------------------|---------------------------|----------|-------------------|
| `deploymentName` | [object](#deploymentname) | No       | Deployment config |

### deploymentName

Deployment config

#### Properties

| Property                | Type     | Required | Description                                                                                                                                  |
|-------------------------|----------|----------|----------------------------------------------------------------------------------------------------------------------------------------------|
| `computeUnits`          | number   | No       | Number of compute units you require. 1 compute unit = 2GB. Currently the only allowed value is 1. This will change in the future. Default: 1 |
| `effectors`             | string[] | No       | Effector CIDs to be used in the deal. Must be a valid CID                                                                                    |
| `initialBalance`        | number   | No       | Initial balance after deploy in FLT                                                                                                          |
| `maxWorkersPerProvider` | number   | No       | Max workers per provider. Matches target workers by default                                                                                  |
| `minWorkers`            | number   | No       | Required workers to activate the deal. Matches target workers by default                                                                     |
| `pricePerWorkerEpoch`   | number   | No       | Price per worker epoch in FLT                                                                                                                |
| `services`              | string[] | No       | An array of service names to include in this worker. Service names must be listed in fluence.yaml                                            |
| `spells`                | string[] | No       | An array of spell names to include in this worker. Spell names must be listed in fluence.yaml                                                |
| `targetWorkers`         | number   | No       | Max workers in the deal                                                                                                                      |

## hosts

A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on. Intended to be used by providers to deploy directly without using the blockchain

### Properties

| Property     | Type                  | Required | Description       |
|--------------|-----------------------|----------|-------------------|
| `workerName` | [object](#workername) | No       | Deployment config |

### workerName

Deployment config

#### Properties

| Property   | Type     | Required | Description                                                                                       |
|------------|----------|----------|---------------------------------------------------------------------------------------------------|
| `peerIds`  | string[] | No       | An array of peer IDs to deploy on                                                                 |
| `services` | string[] | No       | An array of service names to include in this worker. Service names must be listed in fluence.yaml |
| `spells`   | string[] | No       | An array of spell names to include in this worker. Spell names must be listed in fluence.yaml     |

## services

A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config

### Properties

| Property       | Type                    | Required | Description                                                       |
|----------------|-------------------------|----------|-------------------------------------------------------------------|
| `Service_name` | [object](#service_name) | No       | Service config. Defines where the service is and how to deploy it |

### Service_name

Service config. Defines where the service is and how to deploy it

#### Properties

| Property           | Type                       | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|--------------------|----------------------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `get`              | string                     | **Yes**  | Path to service directory or URL to the tar.gz archive with the service                                                                                                                                                                                                                                                                                                                                                                                   |
| `overrideModules`  | [object](#overridemodules) | No       | A map of modules to override                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `totalMemoryLimit` | string                     | No       | Memory limit for all service modules. If you specify this property please make sure it's at least `2 MiB * numberOfModulesInTheService`. In repl default is: Infinity. When deploying service as part of the worker default is: computeUnits * 2GB / (amount of services in the worker). Format: [number][whitespace?][B] where ? is an optional field and B is one of the following: kB, KB, kiB, KiB, KIB, mB, MB, miB, MiB, MIB, gB, GB, giB, GiB, GIB |

#### overrideModules

A map of modules to override

##### Properties

| Property      | Type                   | Required | Description                     |
|---------------|------------------------|----------|---------------------------------|
| `Module_name` | [object](#module_name) | No       | Overrides for the module config |

##### Module_name

Overrides for the module config

###### Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                                                                                                      |
|-------------------|----------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `envs`            | [object](#envs)            | No       | environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl                   |
| `loggerEnabled`   | boolean                    | No       | Set true to allow module to use the Marine SDK logger                                                                                                                                                                                                                            |
| `loggingMask`     | number                     | No       | manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map                                                                                                                                       |
| `maxHeapSize`     | string                     | No       | DEPRECATED. Use `totalMemoryLimit` service property instead. Max size of the heap that a module can allocate in format: [number][whitespace?][B] where ? is an optional field and B is one of the following: kB, KB, kiB, KiB, KIB, mB, MB, miB, MiB, MIB, gB, GB, giB, GiB, GIB |
| `mountedBinaries` | [object](#mountedbinaries) | No       | A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl                                                                                                                                                                                    |
| `volumes`         | [object](#volumes)         | No       | A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file                                                                                                                               |

###### envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

**Properties**

| Property                    | Type   | Required | Description                |
|-----------------------------|--------|----------|----------------------------|
| `Environment_variable_name` | string | No       | Environment variable value |

###### mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

**Properties**

| Property              | Type   | Required | Description              |
|-----------------------|--------|----------|--------------------------|
| `Mounted_binary_name` | string | No       | Path to a mounted binary |

###### volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file

**Properties**

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `Alias`  | string | No       | path        |

## spells

A map with spell names as keys and spell configs as values

### Properties

| Property     | Type                  | Required | Description  |
|--------------|-----------------------|----------|--------------|
| `Spell_name` | [object](#spell_name) | No       | Spell config |

### Spell_name

Spell config

#### Properties

| Property       | Type                | Required | Description                                                                                                                                                                                     |
|----------------|---------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `get`          | string              | **Yes**  | Path to spell                                                                                                                                                                                   |
| `aquaFilePath` | string              | No       | Path to Aqua file which contains an Aqua function that you want to use as a spell                                                                                                               |
| `clock`        | [object](#clock)    | No       | Trigger the spell execution periodically. If you want to disable this property by overriding it in fluence.yaml - pass empty config for it like this: `clock: {}`                               |
| `function`     | string              | No       | Name of the Aqua function that you want to use as a spell                                                                                                                                       |
| `initArgs`     | [object](#initargs) | No       | A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function and will be stored in the key-value storage for this particular spell. |
| `version`      | number              | No       |                                                                                                                                                                                                 |

#### clock

Trigger the spell execution periodically. If you want to disable this property by overriding it in fluence.yaml - pass empty config for it like this: `clock: {}`

##### Properties

| Property         | Type   | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
|------------------|--------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `endDelaySec`    | number | No       | How long to wait before the last execution in seconds. If this property or `endTimestamp` not specified, periodic execution will never end. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. If it is in the past at the moment of spell creation - the spell will never be executed. This property conflicts with `endTimestamp`. You can specify only one of them |
| `endTimestamp`   | string | No       | An ISO timestamp when the periodic execution should end. If this property or `endDelaySec` not specified, periodic execution will never end. If it is in the past at the moment of spell creation on Rust peer - the spell will never be executed                                                                                                                                                                              |
| `periodSec`      | number | No       | How often the spell will be executed. If set to 0, the spell will be executed only once. If this value not provided at all - the spell will never be executed                                                                                                                                                                                                                                                                  |
| `startDelaySec`  | number | No       | How long to wait before the first execution in seconds. If this property or `startTimestamp` not specified, periodic execution will start immediately. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. This property conflicts with `startTimestamp`. You can specify only one of them                                                                             |
| `startTimestamp` | string | No       | An ISO timestamp when the periodic execution should start. If this property or `startDelaySec` not specified, periodic execution will start immediately. If it is set to 0 - the spell will never be executed                                                                                                                                                                                                                  |

#### initArgs

A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function and will be stored in the key-value storage for this particular spell.

| Property | Type | Required | Description |
|----------|------|----------|-------------|

