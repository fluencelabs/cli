## Properties

| Property       | Type                      | Required | Description |
|----------------|---------------------------|----------|-------------|
| `computePeers` | [object](#computepeers)[] | **Yes**  |             |
| `offer`        | [object](#offer)          | **Yes**  |             |
| `version`      | number                    | **Yes**  |             |

## computePeers

### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `peerId` | string | **Yes**  |             |
| `slots`  | number | **Yes**  |             |

## offer

### Properties

| Property           | Type     | Required | Description |
|--------------------|----------|----------|-------------|
| `effectors`        | string[] | **Yes**  |             |
| `maxCollateral`    | number   | **Yes**  |             |
| `minCollateral`    | number   | **Yes**  |             |
| `minPricePerEpoch` | number   | **Yes**  |             |

