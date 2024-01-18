# provider.yaml

Defines config used for provider set up

## Properties

| Property              | Type                           | Required | Description                                                                                                                                                                                                 |
|-----------------------|--------------------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `computePeers`        | [object](#computepeers)        | **Yes**  | A map with compute peer names as keys and compute peers as values                                                                                                                                           |
| `offers`              | [object](#offers)              | **Yes**  | A map with offer names as keys and offers as values                                                                                                                                                         |
| `version`             | number                         | **Yes**  | Config version                                                                                                                                                                                              |
| `capacityCommitments` | [object](#capacitycommitments) | No       | A map with nox names as keys and capacity commitments as values                                                                                                                                             |
| `env`                 | string                         | No       | DEPRECATED: for simplicity, your project env determines chain environment that is used both for provider and for fluence application developer. To set your project env, use `fluence default env` command. |
| `nox`                 | [object](#nox)                 | No       | Configuration to pass to the nox compute peer. Config.toml files are generated from this config                                                                                                             |

## capacityCommitments

A map with nox names as keys and capacity commitments as values

### Properties

| Property  | Type               | Required | Description                   |
|-----------|--------------------|----------|-------------------------------|
| `noxName` | [object](#noxname) | No       | Defines a capacity commitment |

### noxName

Defines a capacity commitment

#### Properties

| Property               | Type   | Required | Description                                                                   |
|------------------------|--------|----------|-------------------------------------------------------------------------------|
| `delegator`            | string | **Yes**  | Delegator address                                                             |
| `duration`             | string | **Yes**  | Duration of the commitment in human-readable format. Example: 1 months 1 days |
| `rewardDelegationRate` | number | **Yes**  | Reward delegation rate in percent                                             |

## computePeers

A map with compute peer names as keys and compute peers as values

### Properties

| Property      | Type                   | Required | Description            |
|---------------|------------------------|----------|------------------------|
| `ComputePeer` | [object](#computepeer) | No       | Defines a compute peer |

### ComputePeer

Defines a compute peer

#### Properties

| Property       | Type           | Required | Description                                                                                     |
|----------------|----------------|----------|-------------------------------------------------------------------------------------------------|
| `computeUnits` | number         | **Yes**  | How many compute units should nox have. Default: 32 (each compute unit requires 2GB of RAM)     |
| `nox`          | [object](#nox) | No       | Configuration to pass to the nox compute peer. Config.toml files are generated from this config |

#### nox

Configuration to pass to the nox compute peer. Config.toml files are generated from this config

##### Properties

| Property         | Type                      | Required | Description                                                                                                       |
|------------------|---------------------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize` | number                    | No       | Number of aquavm instances to run. Default: 2                                                                     |
| `httpPort`       | number                    | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `rawConfig`      | string                    | No       | Raw TOML config string to parse and merge with the rest of the config. Has the highest priority                   |
| `systemServices` | [object](#systemservices) | No       | System services to run by default. aquaIpfs and decider are enabled by default                                    |
| `tcpPort`        | number                    | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `websocketPort`  | number                    | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |

##### systemServices

System services to run by default. aquaIpfs and decider are enabled by default

###### Properties

| Property   | Type                | Required | Description                       |
|------------|---------------------|----------|-----------------------------------|
| `aquaIpfs` | [object](#aquaipfs) | No       | Aqua IPFS service configuration   |
| `decider`  | [object](#decider)  | No       | Decider service configuration     |
| `enable`   | string[]            | No       | List of system services to enable |

###### aquaIpfs

Aqua IPFS service configuration

**Properties**

| Property               | Type   | Required | Description                       |
|------------------------|--------|----------|-----------------------------------|
| `externalApiMultiaddr` | string | No       | Multiaddress of external IPFS API |
| `localApiMultiaddr`    | string | No       | Multiaddress of local IPFS API    |

###### decider

Decider service configuration

**Properties**

| Property              | Type   | Required | Description                      |
|-----------------------|--------|----------|----------------------------------|
| `deciderPeriodSec`    | number | No       | Decider period in seconds        |
| `matcherAddress`      | string | No       | Matcher address                  |
| `networkApiEndpoint`  | string | No       | Network API endpoint             |
| `networkId`           | number | No       | Network ID                       |
| `startBlock`          | string | No       | Start block                      |
| `walletKey`           | string | No       | Wallet key                       |
| `workerIpfsMultiaddr` | string | No       | Multiaddress of worker IPFS node |

## nox

Configuration to pass to the nox compute peer. Config.toml files are generated from this config

### Properties

| Property         | Type                      | Required | Description                                                                                                       |
|------------------|---------------------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize` | number                    | No       | Number of aquavm instances to run. Default: 2                                                                     |
| `httpPort`       | number                    | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `rawConfig`      | string                    | No       | Raw TOML config string to parse and merge with the rest of the config. Has the highest priority                   |
| `systemServices` | [object](#systemservices) | No       | System services to run by default. aquaIpfs and decider are enabled by default                                    |
| `tcpPort`        | number                    | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `websocketPort`  | number                    | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |

### systemServices

System services to run by default. aquaIpfs and decider are enabled by default

#### Properties

| Property   | Type                | Required | Description                       |
|------------|---------------------|----------|-----------------------------------|
| `aquaIpfs` | [object](#aquaipfs) | No       | Aqua IPFS service configuration   |
| `decider`  | [object](#decider)  | No       | Decider service configuration     |
| `enable`   | string[]            | No       | List of system services to enable |

#### aquaIpfs

Aqua IPFS service configuration

##### Properties

| Property               | Type   | Required | Description                       |
|------------------------|--------|----------|-----------------------------------|
| `externalApiMultiaddr` | string | No       | Multiaddress of external IPFS API |
| `localApiMultiaddr`    | string | No       | Multiaddress of local IPFS API    |

#### decider

Decider service configuration

##### Properties

| Property              | Type   | Required | Description                      |
|-----------------------|--------|----------|----------------------------------|
| `deciderPeriodSec`    | number | No       | Decider period in seconds        |
| `matcherAddress`      | string | No       | Matcher address                  |
| `networkApiEndpoint`  | string | No       | Network API endpoint             |
| `networkId`           | number | No       | Network ID                       |
| `startBlock`          | string | No       | Start block                      |
| `walletKey`           | string | No       | Wallet key                       |
| `workerIpfsMultiaddr` | string | No       | Multiaddress of worker IPFS node |

## offers

A map with offer names as keys and offers as values

### Properties

| Property | Type             | Required | Description              |
|----------|------------------|----------|--------------------------|
| `Offer`  | [object](#offer) | No       | Defines a provider offer |

### Offer

Defines a provider offer

#### Properties

| Property                 | Type     | Required | Description                                   |
|--------------------------|----------|----------|-----------------------------------------------|
| `computePeers`           | string[] | **Yes**  | Number of Compute Units for this Compute Peer |
| `minPricePerWorkerEpoch` | number   | **Yes**  | Minimum price per worker epoch in FLT         |
| `effectors`              | string[] | No       |                                               |

