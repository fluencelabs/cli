# provider.yaml

Defines config used for provider set up

## Properties

| Property       | Type                    | Required | Description |
|----------------|-------------------------|----------|-------------|
| `computePeers` | [object](#computepeers) | **Yes**  |             |
| `offers`       | [object](#offers)       | **Yes**  |             |
| `version`      | number                  | **Yes**  |             |

## computePeers

### Properties

| Property      | Type                   | Required | Description |
|---------------|------------------------|----------|-------------|
| `ComputePeer` | [object](#computepeer) | No       |             |

### ComputePeer

#### Properties

| Property        | Type   | Required | Description                                                                                                       |
|-----------------|--------|----------|-------------------------------------------------------------------------------------------------------------------|
| `tcpPort`       | number | No       | Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from 7771       |
| `webSocketPort` | number | No       | Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from 9991 |
| `worker`        | number | No       |                                                                                                                   |

## offers

### Properties

| Property | Type             | Required | Description |
|----------|------------------|----------|-------------|
| `Offer`  | [object](#offer) | No       |             |

### Offer

#### Properties

| Property                 | Type     | Required | Description |
|--------------------------|----------|----------|-------------|
| `computePeers`           | string[] | **Yes**  |             |
| `maxCollateralPerWorker` | number   | **Yes**  |             |
| `minPricePerWorkerEpoch` | number   | **Yes**  |             |
| `effectors`              | string[] | No       |             |

