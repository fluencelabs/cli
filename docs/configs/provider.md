## Properties

| Property           | Type                      | Required | Description |
|--------------------|---------------------------|----------|-------------|
| `version`          | number                    | **Yes**  |             |
| `computePeers`     | [object](#computepeers)[] | No       |             |
| `effectors`        | string[]                  | No       |             |
| `maxCollateral`    | number                    | No       |             |
| `minCollateral`    | number                    | No       |             |
| `minPricePerEpoch` | number                    | No       |             |

## computePeers

### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `peerId` | string | **Yes**  |             |
| `slots`  | number | **Yes**  |             |

