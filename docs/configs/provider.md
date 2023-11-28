# provider.yaml

Defines config used for provider set up

## Properties

| Property       | Type                    | Required | Description                                                                                                                              |
|----------------|-------------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------|
| `computePeers` | [object](#computepeers) | **Yes**  | A map with compute peer names as keys and compute peers as values                                                                        |
| `env`          | string                  | **Yes**  | Defines the the environment for which you intend to generate nox configuration Possible values are: `kras`, `testnet`, `stage`, `local`. |
| `offers`       | [object](#offers)       | **Yes**  | A map with offer names as keys and offers as values                                                                                      |
| `version`      | number                  | **Yes**  |                                                                                                                                          |
| `nox`          | [object](#nox)          | No       | Configuration to pass to the nox compute peer. Config.toml files are generated from this config                                          |

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
| `computeUnits` | number         | No       |                                                                                                 |
| `nox`          | [object](#nox) | No       | Configuration to pass to the nox compute peer. Config.toml files are generated from this config |

#### nox

Configuration to pass to the nox compute peer. Config.toml files are generated from this config

##### Properties

| Property         | Type                      | Required | Description                                                                                                       |
|------------------|---------------------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize` | number                    | No       | Number of aquavm instances to run. Default: 2                                                                     |
| `httpPort`       | number                    | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `rawConfig`      | string                    | No       | Raw TOML config string to append to the generated config. Default: empty string                                   |
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
| `rawConfig`      | string                    | No       | Raw TOML config string to append to the generated config. Default: empty string                                   |
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

| Property                 | Type     | Required | Description                                                        |
|--------------------------|----------|----------|--------------------------------------------------------------------|
| `computePeers`           | string[] | **Yes**  | Number of Compute Units for this Compute Peer                      |
| `maxCollateralPerWorker` | number   | **Yes**  | Max collateral per worker. This number is multiplied by 10^18      |
| `minPricePerWorkerEpoch` | number   | **Yes**  | Minimum price per worker epoch. This number is multiplied by 10^18 |
| `effectors`              | string[] | No       |                                                                    |

