# fluence.yaml

Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use `fluence init` command to generate a template for new Fluence project

## Properties

| Property           | Type                    | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                          |
|--------------------|-------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `version`          | number                  | **Yes**  |                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `aquaImports`      | string[]                | No       | A list of path to be considered by aqua compiler to be used as imports. First dependency in the list has the highest priority. Priority of imports is considered in the following order: imports from --import flags, imports from aquaImports property in fluence.yaml, project's .fluence/aqua dir, npm dependencies from fluence.yaml, npm dependencies from user's .fluence/config.yaml, npm dependencies recommended by fluence |
| `aquaInputPath`    | string                  | No       | Path to the aqua file or directory with aqua files that you want to compile by default. Must be relative to the project root dir                                                                                                                                                                                                                                                                                                     |
| `aquaOutputJSPath` | string                  | No       | Path to the default compilation target dir from aqua to js. Must be relative to the project root dir. Overrides 'aquaOutputTSPath' property                                                                                                                                                                                                                                                                                          |
| `aquaOutputTSPath` | string                  | No       | Path to the default compilation target dir from aqua to ts. Must be relative to the project root dir                                                                                                                                                                                                                                                                                                                                 |
| `chainNetwork`     | string                  | No       | The network in which the transactions will be carried out Possible values are: `local`, `testnet`.                                                                                                                                                                                                                                                                                                                                   |
| `cliVersion`       | string                  | No       | The version of the CLI that is compatible with this project. Set this to enforce a particular set of versions of all fluence components                                                                                                                                                                                                                                                                                              |
| `deals`            | [object](#deals)        | No       | A map of objects with worker names as keys, each object defines a deal                                                                                                                                                                                                                                                                                                                                                               |
| `dependencies`     | [object](#dependencies) | No       | (For advanced users) Overrides for the project dependencies                                                                                                                                                                                                                                                                                                                                                                          |
| `hosts`            | [object](#hosts)        | No       | A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on                                                                                                                                                                                                                                                                                                                             |
| `keyPairName`      | string                  | No       | The name of the Key Pair to use. It is resolved in the following order (from the lowest to the highest priority):                                                                                                                                                                                                                                                                                                                    |
|                    |                         |          | 1. "defaultKeyPairName" property from user-secrets.yaml                                                                                                                                                                                                                                                                                                                                                                              |
|                    |                         |          | 1. "defaultKeyPairName" property from project-secrets.yaml                                                                                                                                                                                                                                                                                                                                                                           |
|                    |                         |          | 1. "keyPairName" property from the top level of fluence.yaml                                                                                                                                                                                                                                                                                                                                                                         |
|                    |                         |          | 1. "keyPairName" property from the "services" level of fluence.yaml                                                                                                                                                                                                                                                                                                                                                                  |
|                    |                         |          | 1. "keyPairName" property from the individual "deploy" property item level of fluence.yaml                                                                                                                                                                                                                                                                                                                                           |
| `relays`           | string, array, or null  | No       | List of Fluence Peer multi addresses or a name of the network. This multi addresses are used for connecting to the Fluence network when deploying. Peer ids from these addresses are also used for deploying in case if you don't specify "peerId" or "peerIds" property in the deployment config. Default: kras                                                                                                                     |
| `services`         | [object](#services)     | No       | A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config                                                                                                                               |
| `spells`           | [object](#spells)       | No       | A map with spell names as keys and spell configs as values                                                                                                                                                                                                                                                                                                                                                                           |
| `workers`          | [object](#workers)      | No       | A Map with worker names as keys and worker configs as values                                                                                                                                                                                                                                                                                                                                                                         |

## deals

A map of objects with worker names as keys, each object defines a deal

### Properties

| Property     | Type                  | Required | Description |
|--------------|-----------------------|----------|-------------|
| `workerName` | [object](#workername) | No       |             |

### workerName

#### Properties

| Property        | Type   | Required | Description                           |
|-----------------|--------|----------|---------------------------------------|
| `minWorkers`    | number | No       | Required workers to activate the deal |
| `targetWorkers` | number | No       | Max workers in the deal               |

## dependencies

(For advanced users) Overrides for the project dependencies

### Properties

| Property | Type             | Required | Description                                                                                                                                |
|----------|------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `cargo`  | [object](#cargo) | No       | A map of cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL |
| `npm`    | [object](#npm)   | No       | A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua                                            |

### cargo

A map of cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL

#### Properties

| Property                | Type   | Required | Description |
|-------------------------|--------|----------|-------------|
| `cargo-dependency-name` | string | No       | version     |

### npm

A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua

#### Properties

| Property              | Type   | Required | Description |
|-----------------------|--------|----------|-------------|
| `npm-dependency-name` | string | No       | version     |

## hosts

A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on

### Properties

| Property     | Type                  | Required | Description |
|--------------|-----------------------|----------|-------------|
| `workerName` | [object](#workername) | No       |             |

### workerName

#### Properties

| Property  | Type     | Required | Description                       |
|-----------|----------|----------|-----------------------------------|
| `peerIds` | string[] | **Yes**  | An array of peer IDs to deploy on |

## services

A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config

### Properties

| Property      | Type                   | Required | Description                                                                                                                                                                                  |
|---------------|------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `serviceName` | [object](#servicename) | No       | Service names as keys (must start with a lowercase letter and contain only letters numbers and underscores) and Service config (defines where the service is and how to deploy it) as values |

### serviceName

Service names as keys (must start with a lowercase letter and contain only letters numbers and underscores) and Service config (defines where the service is and how to deploy it) as values

#### Properties

| Property          | Type                       | Required | Description                                                                                                       |
|-------------------|----------------------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `get`             | string                     | **Yes**  | Path to service directory or URL to the tar.gz archive with the service                                           |
| `deploy`          | [object](#deploy)[]        | No       | [DEPRECATED!] List of deployments for the particular service                                                      |
| `keyPairName`     | string                     | No       | The name of the Key Pair to use. It is resolved in the following order (from the lowest to the highest priority): |
|                   |                            |          | 1. "defaultKeyPairName" property from user-secrets.yaml                                                           |
|                   |                            |          | 1. "defaultKeyPairName" property from project-secrets.yaml                                                        |
|                   |                            |          | 1. "keyPairName" property from the top level of fluence.yaml                                                      |
|                   |                            |          | 1. "keyPairName" property from the "services" level of fluence.yaml                                               |
|                   |                            |          | 1. "keyPairName" property from the individual "deploy" property item level of fluence.yaml                        |
| `overrideModules` | [object](#overridemodules) | No       | A map of modules to override                                                                                      |

#### deploy

A small config for a particular deployment. You can have specific overrides for each and specific deployment properties like count, etc.

##### Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                        |
|-------------------|----------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `deployId`        | string                     | **Yes**  | This id can be used in Aqua to access actually deployed peer and service ids. The ID must start with a lowercase letter and contain only letters, numbers, and underscores.                        |
| `count`           | number                     | No       | Number of services to deploy. Default: 1 or if "peerIds" property is provided - exactly the number of peerIds                                                                                      |
| `keyPairName`     | string                     | No       | The name of the Key Pair to use. It is resolved in the following order (from the lowest to the highest priority):                                                                                  |
|                   |                            |          | 1. "defaultKeyPairName" property from user-secrets.yaml                                                                                                                                            |
|                   |                            |          | 1. "defaultKeyPairName" property from project-secrets.yaml                                                                                                                                         |
|                   |                            |          | 1. "keyPairName" property from the top level of fluence.yaml                                                                                                                                       |
|                   |                            |          | 1. "keyPairName" property from the "services" level of fluence.yaml                                                                                                                                |
|                   |                            |          | 1. "keyPairName" property from the individual "deploy" property item level of fluence.yaml                                                                                                         |
| `overrideModules` | [object](#overridemodules) | No       | A map of modules to override                                                                                                                                                                       |
| `peerId`          | string                     | No       | Peer id or peer id name to deploy to. Default: Peer ids from the "relay" property of fluence.yaml are selected for each deploy. Named peerIds can be listed in "peerIds" property of fluence.yaml) |
| `peerIds`         | string[]                   | No       | Peer ids or peer id names to deploy to. Overrides "peerId" property. Named peerIds can be listed in "peerIds" property of fluence.yaml)                                                            |

##### overrideModules

A map of modules to override

| Property | Type | Required | Description |
|----------|------|----------|-------------|

#### overrideModules

A map of modules to override

##### Properties

| Property     | Type                  | Required | Description                                                        |
|--------------|-----------------------|----------|--------------------------------------------------------------------|
| `moduleName` | [object](#modulename) | No       | Module names as keys and overrides for the module config as values |

##### moduleName

Module names as keys and overrides for the module config as values

###### Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                                                                                    |
|-------------------|----------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `envs`            | [object](#envs)            | No       | environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl |
| `loggerEnabled`   | boolean                    | No       | Set true to allow module to use the Marine SDK logger                                                                                                                                                                                                          |
| `loggingMask`     | number                     | No       | manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map                                                                                                                     |
| `maxHeapSize`     | string                     | No       | Max size of the heap that a module can allocate in format: [number][whitespace?][specificator?] where ? is an optional field and specificator is one from the following (case-insensitive):                                                                    |
|                   |                            |          | K, Kb - kilobyte                                                                                                                                                                                                                                               |
|                   |                            |          | Ki, KiB - kibibyte                                                                                                                                                                                                                                             |
|                   |                            |          | M, Mb - megabyte                                                                                                                                                                                                                                               |
|                   |                            |          | Mi, MiB - mebibyte                                                                                                                                                                                                                                             |
|                   |                            |          | G, Gb - gigabyte                                                                                                                                                                                                                                               |
|                   |                            |          | Gi, GiB - gibibyte                                                                                                                                                                                                                                             |
|                   |                            |          | Current limit is 4 GiB                                                                                                                                                                                                                                         |
| `mountedBinaries` | [object](#mountedbinaries) | No       | A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl                                                                                                                                                                  |
| `volumes`         | [object](#volumes)         | No       | A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file                                                                                                             |

###### envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

**Properties**

| Property            | Type   | Required | Description        |
|---------------------|--------|----------|--------------------|
| `ENV_VARIABLE_NAME` | string | No       | env variable value |

###### mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

**Properties**

| Property            | Type   | Required | Description              |
|---------------------|--------|----------|--------------------------|
| `mountedBinaryName` | string | No       | path to a mounted binary |

###### volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file

**Properties**

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `alias`  | string | No       | path        |

## spells

A map with spell names as keys and spell configs as values

### Properties

| Property    | Type                 | Required | Description  |
|-------------|----------------------|----------|--------------|
| `spellName` | [object](#spellname) | No       | Spell config |

### spellName

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

## workers

A Map with worker names as keys and worker configs as values

### Properties

| Property     | Type                  | Required | Description   |
|--------------|-----------------------|----------|---------------|
| `workerName` | [object](#workername) | No       | Worker config |

### workerName

Worker config

#### Properties

| Property   | Type     | Required | Description                                                                                       |
|------------|----------|----------|---------------------------------------------------------------------------------------------------|
| `services` | string[] | No       | An array of service names to include in this worker. Service names must be listed in fluence.yaml |
| `spells`   | string[] | No       | An array of spell names to include in this worker. Spell names must be listed in fluence.yaml     |

