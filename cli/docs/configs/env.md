# env.yaml

Defines user project preferences

## Properties

| Property        | Type     | Required | Description                                                                                    |
|-----------------|----------|----------|------------------------------------------------------------------------------------------------|
| `version`       | integer  | **Yes**  |                                                                                                |
| `blockScoutUrl` | string   | No       | BlockScout URL to use                                                                          |
| `chainId`       | number   | No       | Chain ID to use                                                                                |
| `fluenceEnv`    | string   | No       | Fluence environment to connect to Possible values are: `testnet`, `mainnet`, `stage`, `local`. |
| `relays`        | string[] | No       | List of custom relay multiaddresses to use when connecting to Fluence network                  |
| `rpcUrl`        | string   | No       | RPC URL to use                                                                                 |
| `subgraphUrl`   | string   | No       | Subgraph URL to use                                                                            |

