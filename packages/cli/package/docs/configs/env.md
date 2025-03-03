# env.yaml

Defines project user's preferences

## Properties

| Property       | Type                    | Required | Description                                                                                    |
|----------------|-------------------------|----------|------------------------------------------------------------------------------------------------|
| `version`      | integer                 | **Yes**  | Config version                                                                                 |
| `fluenceEnv`   | string                  | No       | Fluence environment to connect to Possible values are: `testnet`, `mainnet`, `stage`, `local`. |
| `perEnvConfig` | [object](#perenvconfig) | No       |                                                                                                |

## perEnvConfig

### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `local`   | [object](#local)   | No       |             |
| `mainnet` | [object](#mainnet) | No       |             |
| `stage`   | [object](#stage)   | No       |             |
| `testnet` | [object](#testnet) | No       |             |

### local

#### Properties

| Property        | Type                  | Required | Description                         |
|-----------------|-----------------------|----------|-------------------------------------|
| `blockScoutUrl` | string                | No       | BlockScout URL to use               |
| `chainId`       | number                | No       | Chain ID to use                     |
| `deployment`    | [object](#deployment) | No       | Deployed contract address overrides |
| `ipfsGateway`   | string                | No       | IPFS gateway URL to use             |
| `rpcHttpUrl`    | string                | No       | RPC HTTP URL to use                 |
| `rpcWsUrl`      | string                | No       | RPC WS URL to use                   |
| `subgraphUrl`   | string                | No       | Subgraph URL to use                 |

#### deployment

Deployed contract address overrides

##### Properties

| Property        | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `balanceKeeper` | string | No       |             |
| `diamond`       | string | No       |             |
| `multicall3`    | string | No       |             |
| `usdc`          | string | No       |             |

### mainnet

#### Properties

| Property        | Type                  | Required | Description                         |
|-----------------|-----------------------|----------|-------------------------------------|
| `blockScoutUrl` | string                | No       | BlockScout URL to use               |
| `chainId`       | number                | No       | Chain ID to use                     |
| `deployment`    | [object](#deployment) | No       | Deployed contract address overrides |
| `ipfsGateway`   | string                | No       | IPFS gateway URL to use             |
| `rpcHttpUrl`    | string                | No       | RPC HTTP URL to use                 |
| `rpcWsUrl`      | string                | No       | RPC WS URL to use                   |
| `subgraphUrl`   | string                | No       | Subgraph URL to use                 |

#### deployment

Deployed contract address overrides

##### Properties

| Property        | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `balanceKeeper` | string | No       |             |
| `diamond`       | string | No       |             |
| `multicall3`    | string | No       |             |
| `usdc`          | string | No       |             |

### stage

#### Properties

| Property        | Type                  | Required | Description                         |
|-----------------|-----------------------|----------|-------------------------------------|
| `blockScoutUrl` | string                | No       | BlockScout URL to use               |
| `chainId`       | number                | No       | Chain ID to use                     |
| `deployment`    | [object](#deployment) | No       | Deployed contract address overrides |
| `ipfsGateway`   | string                | No       | IPFS gateway URL to use             |
| `rpcHttpUrl`    | string                | No       | RPC HTTP URL to use                 |
| `rpcWsUrl`      | string                | No       | RPC WS URL to use                   |
| `subgraphUrl`   | string                | No       | Subgraph URL to use                 |

#### deployment

Deployed contract address overrides

##### Properties

| Property        | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `balanceKeeper` | string | No       |             |
| `diamond`       | string | No       |             |
| `multicall3`    | string | No       |             |
| `usdc`          | string | No       |             |

### testnet

#### Properties

| Property        | Type                  | Required | Description                         |
|-----------------|-----------------------|----------|-------------------------------------|
| `blockScoutUrl` | string                | No       | BlockScout URL to use               |
| `chainId`       | number                | No       | Chain ID to use                     |
| `deployment`    | [object](#deployment) | No       | Deployed contract address overrides |
| `ipfsGateway`   | string                | No       | IPFS gateway URL to use             |
| `rpcHttpUrl`    | string                | No       | RPC HTTP URL to use                 |
| `rpcWsUrl`      | string                | No       | RPC WS URL to use                   |
| `subgraphUrl`   | string                | No       | Subgraph URL to use                 |

#### deployment

Deployed contract address overrides

##### Properties

| Property        | Type   | Required | Description |
|-----------------|--------|----------|-------------|
| `balanceKeeper` | string | No       |             |
| `diamond`       | string | No       |             |
| `multicall3`    | string | No       |             |
| `usdc`          | string | No       |             |

