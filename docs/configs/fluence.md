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
| `peerIds`          | [object](#peerids)      | No       | A map of named peerIds. Example:                                                                                                                                                                                                                                                                                                                                                                                                     |
|                    |                         |          | MY_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS                                                                                                                                                                                                                                                                                                                                                                        |
| `relays`           | string, array, or null  | No       | List of Fluence Peer multi addresses or a name of the network. This multi addresses are used for connecting to the Fluence network when deploying. Peer ids from these addresses are also used for deploying in case if you don't specify "peerId" or "peerIds" property in the deployment config. Default: kras                                                                                                                     |
| `services`         | [object](#services)     | No       | A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config                                                                                                                               |
| `spells`           | [object](#spells)       | No       | A map with spell names as keys and spell configs as values                                                                                                                                                                                                                                                                                                                                                                           |
| `workers`          | [object](#workers)      | No       | A Map with worker names as keys and worker configs as values                                                                                                                                                                                                                                                                                                                                                                         |

## deals

A map of objects with worker names as keys, each object defines a deal


## dependencies

(For advanced users) Overrides for the project dependencies

### Properties

| Property | Type             | Required | Description                                                                                                                                |
|----------|------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `cargo`  | [object](#cargo) | No       | A map of cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL |
| `npm`    | [object](#npm)   | No       | A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua                                            |

### cargo

A map of cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL


### npm

A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua


## hosts

A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on


## peerIds

A map of named peerIds. Example:
MY_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS


## services

A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config


## spells

A map with spell names as keys and spell configs as values

### Properties

| Property | Type             | Required | Description  |
|----------|------------------|----------|--------------|
| `spell`  | [object](#spell) | No       | Spell config |

### spell

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


## workers

A Map with worker names as keys and worker configs as values


