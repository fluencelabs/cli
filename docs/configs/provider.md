# provider.yaml

Defines config used for provider set up

## Properties

| Property       | Type                    | Required | Description |
|----------------|-------------------------|----------|-------------|
| `computePeers` | [object](#computepeers) | **Yes**  |             |
| `offers`       | [object](#offers)       | **Yes**  |             |
| `version`      | number                  | **Yes**  |             |
| `nox`          | [object](#nox)          | No       |             |

## computePeers

### Properties

| Property      | Type                   | Required | Description |
|---------------|------------------------|----------|-------------|
| `ComputePeer` | [object](#computepeer) | No       |             |

### ComputePeer

#### Properties

| Property       | Type           | Required | Description |
|----------------|----------------|----------|-------------|
| `computeUnits` | number         | No       |             |
| `nox`          | [object](#nox) | No       |             |

#### nox

##### Properties

| Property         | Type   | Required | Description                                                                                                       |
|------------------|--------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize` | number | No       | Number of aquavm instances to run. Default: 8                                                                     |
| `httpPort`       | number | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `rawConfig`      | string | No       | Raw TOML config string to append to the generated config. Default: empty string                                   |
| `tcpPort`        | number | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `websocketPort`  | number | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |

## nox

### Properties

| Property         | Type   | Required | Description                                                                                                       |
|------------------|--------|----------|-------------------------------------------------------------------------------------------------------------------|
| `aquavmPoolSize` | number | No       | Number of aquavm instances to run. Default: 8                                                                     |
| `httpPort`       | number | No       | Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from 18080     |
| `rawConfig`      | string | No       | Raw TOML config string to append to the generated config. Default: empty string                                   |
| `tcpPort`        | number | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `websocketPort`  | number | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |

## offers

### Properties

| Property | Type             | Required | Description |
|----------|------------------|----------|-------------|
| `Offer`  | [object](#offer) | No       |             |

### Offer

#### Properties

| Property                 | Type     | Required | Description                                   |
|--------------------------|----------|----------|-----------------------------------------------|
| `computePeers`           | string[] | **Yes**  | Number of Compute Units for this Compute Peer |
| `maxCollateralPerWorker` | number   | **Yes**  |                                               |
| `minPricePerWorkerEpoch` | number   | **Yes**  |                                               |
| `effectors`              | string[] | No       |                                               |

