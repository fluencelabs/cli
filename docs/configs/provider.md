# provider.yaml

Defines config used for provider set up

## Properties

| Property              | Type                           | Required | Description                                                                                     |
|-----------------------|--------------------------------|----------|-------------------------------------------------------------------------------------------------|
| `capacityCommitments` | [object](#capacitycommitments) | **Yes**  | A map with nox names as keys and capacity commitments as values                                 |
| `computePeers`        | [object](#computepeers)        | **Yes**  | A map with compute peer names as keys and compute peers as values                               |
| `offers`              | [object](#offers)              | **Yes**  | A map with offer names as keys and offers as values                                             |
| `providerName`        | string                         | **Yes**  | Provider name. Must not be empty                                                                |
| `version`             | integer                        | **Yes**  | Config version                                                                                  |
| `ccp`                 | [object](#ccp)                 | No       | Configuration to pass to the Capacity Commitment Prover                                         |
| `nox`                 | [object](#nox)                 | No       | Configuration to pass to the nox compute peer. Config.toml files are generated from this config |

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
| `duration`             | string | **Yes**  | Duration of the commitment in human-readable format. Example: 1 months 1 days |
| `rewardDelegationRate` | number | **Yes**  | Reward delegation rate in percent                                             |
| `delegator`            | string | No       | Delegator address                                                             |

## ccp

Configuration to pass to the Capacity Commitment Prover

### Properties

| Property             | Type                          | Required | Description                                                                                     |
|----------------------|-------------------------------|----------|-------------------------------------------------------------------------------------------------|
| `logs`               | [object](#logs)               | No       | Logs configuration                                                                              |
| `prometheusEndpoint` | [object](#prometheusendpoint) | No       | Prometheus endpoint configuration                                                               |
| `rawConfig`          | string                        | No       | Raw TOML config string to parse and merge with the rest of the config. Has the highest priority |
| `rpcEndpoint`        | [object](#rpcendpoint)        | No       | RPC endpoint configuration                                                                      |
| `statePath`          | string                        | No       | Path to the state file. Default: /fluence/data                                                  |

### logs

Logs configuration

#### Properties

| Property         | Type    | Required | Description                     |
|------------------|---------|----------|---------------------------------|
| `logLevel`       | string  | No       | Log level. Default: info        |
| `reportHashrate` | boolean | No       | Report hashrate. Default: false |

### prometheusEndpoint

Prometheus endpoint configuration

#### Properties

| Property | Type    | Required | Description                       |
|----------|---------|----------|-----------------------------------|
| `host`   | string  | No       | Prometheus host. Default: 0.0.0.0 |
| `port`   | integer | No       | Prometheus port. Default: 9384    |

### rpcEndpoint

RPC endpoint configuration

#### Properties

| Property | Type    | Required | Description                |
|----------|---------|----------|----------------------------|
| `host`   | string  | No       | RPC host. Default: 0.0.0.0 |
| `port`   | integer | No       | RPC port. Default: 9389    |

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
| `computeUnits` | integer        | **Yes**  | How many compute units should nox have. Default: 32 (each compute unit requires 2GB of RAM)     |
| `ccp`          | [object](#ccp) | No       | Configuration to pass to the Capacity Commitment Prover                                         |
| `nox`          | [object](#nox) | No       | Configuration to pass to the nox compute peer. Config.toml files are generated from this config |

#### ccp

Configuration to pass to the Capacity Commitment Prover

##### Properties

| Property             | Type                          | Required | Description                                                                                     |
|----------------------|-------------------------------|----------|-------------------------------------------------------------------------------------------------|
| `logs`               | [object](#logs)               | No       | Logs configuration                                                                              |
| `prometheusEndpoint` | [object](#prometheusendpoint) | No       | Prometheus endpoint configuration                                                               |
| `rawConfig`          | string                        | No       | Raw TOML config string to parse and merge with the rest of the config. Has the highest priority |
| `rpcEndpoint`        | [object](#rpcendpoint)        | No       | RPC endpoint configuration                                                                      |
| `statePath`          | string                        | No       | Path to the state file. Default: /fluence/data                                                  |

##### logs

Logs configuration

###### Properties

| Property         | Type    | Required | Description                     |
|------------------|---------|----------|---------------------------------|
| `logLevel`       | string  | No       | Log level. Default: info        |
| `reportHashrate` | boolean | No       | Report hashrate. Default: false |

##### prometheusEndpoint

Prometheus endpoint configuration

###### Properties

| Property | Type    | Required | Description                       |
|----------|---------|----------|-----------------------------------|
| `host`   | string  | No       | Prometheus host. Default: 0.0.0.0 |
| `port`   | integer | No       | Prometheus port. Default: 9384    |

##### rpcEndpoint

RPC endpoint configuration

###### Properties

| Property | Type    | Required | Description                |
|----------|---------|----------|----------------------------|
| `host`   | string  | No       | RPC host. Default: 0.0.0.0 |
| `port`   | integer | No       | RPC port. Default: 9389    |

#### nox

Configuration to pass to the nox compute peer. Config.toml files are generated from this config

##### Properties

| Property                 | Type                      | Required | Description                                                                                                       |
|--------------------------|---------------------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize`         | integer                   | No       | Number of aquavm instances to run. Default: 2                                                                     |
| `ccp`                    | [object](#ccp)            | No       | For advanced users. CCP config                                                                                    |
| `chain`                  | [object](#chain)          | No       | Chain config                                                                                                      |
| `cpusRange`              | string                    | No       | Range of CPU cores to use. Default: 1-32                                                                          |
| `effectors`              | [object](#effectors)      | No       | Effectors to allow on the nox                                                                                     |
| `externalMultiaddresses` | string[]                  | No       | List of external multiaddresses                                                                                   |
| `httpPort`               | integer                   | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `ipfs`                   | [object](#ipfs)           | No       | IPFS config                                                                                                       |
| `listenIp`               | string                    | No       | IP to listen on                                                                                                   |
| `metrics`                | [object](#metrics)        | No       | Metrics configuration                                                                                             |
| `rawConfig`              | string                    | No       | Raw TOML config string to parse and merge with the rest of the config. Has the highest priority                   |
| `systemCpuCount`         | integer                   | No       | Number of CPU cores to allocate for the Nox itself. Default: 1                                                    |
| `systemServices`         | [object](#systemservices) | No       | System services to run by default. aquaIpfs and decider are enabled by default                                    |
| `tcpPort`                | integer                   | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `websocketPort`          | integer                   | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |

##### ccp

For advanced users. CCP config

###### Properties

| Property          | Type   | Required | Description                                                                                                 |
|-------------------|--------|----------|-------------------------------------------------------------------------------------------------------------|
| `ccpEndpoint`     | string | No       | CCP endpoint. Default comes from top-level ccp config: http://{ccp.rpcEndpoint.host}:{ccp.rpcEndpoint.port} |
| `proofPollPeriod` | string | No       | Proof poll period                                                                                           |

##### chain

Chain config

###### Properties

| Property             | Type    | Required | Description                                     |
|----------------------|---------|----------|-------------------------------------------------|
| `ccContract`         | string  | No       | Capacity commitment contract address            |
| `coreContract`       | string  | No       | Core contract address                           |
| `dealSyncStartBlock` | string  | No       | Start block                                     |
| `httpEndpoint`       | string  | No       | HTTP endpoint of the chain                      |
| `marketContract`     | string  | No       | Market contract address                         |
| `networkId`          | integer | No       | Network ID                                      |
| `walletPrivateKey`   | string  | No       | Nox wallet private key. Is generated by default |
| `wsEndpoint`         | string  | No       | WebSocket endpoint of the chain                 |

##### effectors

Effectors to allow on the nox

###### Properties

| Property       | Type                    | Required | Description            |
|----------------|-------------------------|----------|------------------------|
| `effectorName` | [object](#effectorname) | No       | Effector configuration |

###### effectorName

Effector configuration

**Properties**

| Property          | Type                       | Required | Description              |
|-------------------|----------------------------|----------|--------------------------|
| `allowedBinaries` | [object](#allowedbinaries) | **Yes**  | Allowed binaries         |
| `wasmCID`         | string                     | **Yes**  | Wasm CID of the effector |

**allowedBinaries**

Allowed binaries

**Properties**

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `curl`   | string | No       |             |

##### ipfs

IPFS config

###### Properties

| Property               | Type   | Required | Description                       |
|------------------------|--------|----------|-----------------------------------|
| `externalApiMultiaddr` | string | No       | Multiaddress of external IPFS API |
| `localApiMultiaddr`    | string | No       | Multiaddress of local IPFS API    |

##### metrics

Metrics configuration

###### Properties

| Property                      | Type    | Required | Description                    |
|-------------------------------|---------|----------|--------------------------------|
| `enabled`                     | boolean | No       | Metrics enabled                |
| `timerResolution`             | string  | No       | Timer resolution               |
| `tokioDetailedMetricsEnabled` | boolean | No       | Tokio detailed metrics enabled |
| `tokioMetricsEnabled`         | boolean | No       | Tokio metrics enabled          |

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

| Property              | Type    | Required | Description                      |
|-----------------------|---------|----------|----------------------------------|
| `deciderPeriodSec`    | integer | No       | Decider period in seconds        |
| `matcherAddress`      | string  | No       | Matcher address                  |
| `networkApiEndpoint`  | string  | No       | Network API endpoint             |
| `networkId`           | integer | No       | Network ID                       |
| `startBlock`          | string  | No       | Start block                      |
| `walletKey`           | string  | No       | Wallet key                       |
| `workerIpfsMultiaddr` | string  | No       | Multiaddress of worker IPFS node |

## nox

Configuration to pass to the nox compute peer. Config.toml files are generated from this config

### Properties

| Property                 | Type                      | Required | Description                                                                                                       |
|--------------------------|---------------------------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize`         | integer                   | No       | Number of aquavm instances to run. Default: 2                                                                     |
| `ccp`                    | [object](#ccp)            | No       | For advanced users. CCP config                                                                                    |
| `chain`                  | [object](#chain)          | No       | Chain config                                                                                                      |
| `cpusRange`              | string                    | No       | Range of CPU cores to use. Default: 1-32                                                                          |
| `effectors`              | [object](#effectors)      | No       | Effectors to allow on the nox                                                                                     |
| `externalMultiaddresses` | string[]                  | No       | List of external multiaddresses                                                                                   |
| `httpPort`               | integer                   | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `ipfs`                   | [object](#ipfs)           | No       | IPFS config                                                                                                       |
| `listenIp`               | string                    | No       | IP to listen on                                                                                                   |
| `metrics`                | [object](#metrics)        | No       | Metrics configuration                                                                                             |
| `rawConfig`              | string                    | No       | Raw TOML config string to parse and merge with the rest of the config. Has the highest priority                   |
| `systemCpuCount`         | integer                   | No       | Number of CPU cores to allocate for the Nox itself. Default: 1                                                    |
| `systemServices`         | [object](#systemservices) | No       | System services to run by default. aquaIpfs and decider are enabled by default                                    |
| `tcpPort`                | integer                   | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `websocketPort`          | integer                   | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |

### ccp

For advanced users. CCP config

#### Properties

| Property          | Type   | Required | Description                                                                                                 |
|-------------------|--------|----------|-------------------------------------------------------------------------------------------------------------|
| `ccpEndpoint`     | string | No       | CCP endpoint. Default comes from top-level ccp config: http://{ccp.rpcEndpoint.host}:{ccp.rpcEndpoint.port} |
| `proofPollPeriod` | string | No       | Proof poll period                                                                                           |

### chain

Chain config

#### Properties

| Property             | Type    | Required | Description                                     |
|----------------------|---------|----------|-------------------------------------------------|
| `ccContract`         | string  | No       | Capacity commitment contract address            |
| `coreContract`       | string  | No       | Core contract address                           |
| `dealSyncStartBlock` | string  | No       | Start block                                     |
| `httpEndpoint`       | string  | No       | HTTP endpoint of the chain                      |
| `marketContract`     | string  | No       | Market contract address                         |
| `networkId`          | integer | No       | Network ID                                      |
| `walletPrivateKey`   | string  | No       | Nox wallet private key. Is generated by default |
| `wsEndpoint`         | string  | No       | WebSocket endpoint of the chain                 |

### effectors

Effectors to allow on the nox

#### Properties

| Property       | Type                    | Required | Description            |
|----------------|-------------------------|----------|------------------------|
| `effectorName` | [object](#effectorname) | No       | Effector configuration |

#### effectorName

Effector configuration

##### Properties

| Property          | Type                       | Required | Description              |
|-------------------|----------------------------|----------|--------------------------|
| `allowedBinaries` | [object](#allowedbinaries) | **Yes**  | Allowed binaries         |
| `wasmCID`         | string                     | **Yes**  | Wasm CID of the effector |

##### allowedBinaries

Allowed binaries

###### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `curl`   | string | No       |             |

### ipfs

IPFS config

#### Properties

| Property               | Type   | Required | Description                       |
|------------------------|--------|----------|-----------------------------------|
| `externalApiMultiaddr` | string | No       | Multiaddress of external IPFS API |
| `localApiMultiaddr`    | string | No       | Multiaddress of local IPFS API    |

### metrics

Metrics configuration

#### Properties

| Property                      | Type    | Required | Description                    |
|-------------------------------|---------|----------|--------------------------------|
| `enabled`                     | boolean | No       | Metrics enabled                |
| `timerResolution`             | string  | No       | Timer resolution               |
| `tokioDetailedMetricsEnabled` | boolean | No       | Tokio detailed metrics enabled |
| `tokioMetricsEnabled`         | boolean | No       | Tokio metrics enabled          |

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

| Property              | Type    | Required | Description                      |
|-----------------------|---------|----------|----------------------------------|
| `deciderPeriodSec`    | integer | No       | Decider period in seconds        |
| `matcherAddress`      | string  | No       | Matcher address                  |
| `networkApiEndpoint`  | string  | No       | Network API endpoint             |
| `networkId`           | integer | No       | Network ID                       |
| `startBlock`          | string  | No       | Start block                      |
| `walletKey`           | string  | No       | Wallet key                       |
| `workerIpfsMultiaddr` | string  | No       | Multiaddress of worker IPFS node |

## offers

A map with offer names as keys and offers as values

### Properties

| Property | Type             | Required | Description              |
|----------|------------------|----------|--------------------------|
| `Offer`  | [object](#offer) | No       | Defines a provider offer |

### Offer

Defines a provider offer

#### Properties

| Property                 | Type     | Required | Description                                                                        |
|--------------------------|----------|----------|------------------------------------------------------------------------------------|
| `computePeers`           | string[] | **Yes**  | Number of Compute Units for this Compute Peer                                      |
| `minPricePerWorkerEpoch` | string   | **Yes**  | Minimum price per worker epoch in USDC                                             |
| `effectors`              | string[] | No       |                                                                                    |
| `maxProtocolVersion`     | integer  | No       | Max protocol version. Must be more then or equal to minProtocolVersion. Default: 1 |
| `minProtocolVersion`     | integer  | No       | Min protocol version. Must be less then or equal to maxProtocolVersion. Default: 1 |

