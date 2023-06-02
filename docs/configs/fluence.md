# fluence.yaml

Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use `fluence init` command to generate a template for new Fluence project

## Properties

| Property           | Type                    | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                          |
|--------------------|-------------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `version`          | number                  | **Yes**  |                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `appJSPath`        | string                  | No       | Path to the directory where you want to generate app.js after deployment. If you run registerApp() function in your javascript code after initializing FluenceJS client you will be able to access ids of the deployed services in aqua                                                                                                                                                                                              |
| `appTSPath`        | string                  | No       | Path to the directory where you want to generate app.ts after deployment. If you run registerApp() function in your typescript code after initializing FluenceJS client you will be able to access ids of the deployed services in aqua                                                                                                                                                                                              |
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
|                    |                         |          |                                                                                                                                                                                                                                                                                                                                                                                                                                      |
|                    |                         |          | MY_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS                                                                                                                                                                                                                                                                                                                                                                        |
| `relays`           | string, array, or null  | No       | List of Fluence Peer multi addresses or a name of the network. This multi addresses are used for connecting to the Fluence network when deploying. Peer ids from these addresses are also used for deploying in case if you don't specify "peerId" or "peerIds" property in the deployment config. Default: kras                                                                                                                     |
| `services`         | [object](#services)     | No       | A map with service names as keys and Service configs as values. You can have any number of services listed here (According to JSON schema they are called 'additionalProperties') as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config                                                             |
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

| Property | Type | Required | Description |
|----------|------|----------|-------------|

### npm

A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## hosts

A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## peerIds

A map of named peerIds. Example:

MY_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## services

A map with service names as keys and Service configs as values. You can have any number of services listed here (According to JSON schema they are called 'additionalProperties') as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## spells

A map with spell names as keys and spell configs as values

| Property | Type | Required | Description |
|----------|------|----------|-------------|

## workers

A Map with worker names as keys and worker configs as values

| Property | Type | Required | Description |
|----------|------|----------|-------------|

