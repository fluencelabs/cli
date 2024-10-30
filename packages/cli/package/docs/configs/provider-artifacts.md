# provider-artifacts.yaml

Defines artifacts created by the provider

## Properties

| Property  | Type              | Required | Description    |
|-----------|-------------------|----------|----------------|
| `offers`  | [object](#offers) | **Yes**  | Created offers |
| `version` | integer           | **Yes**  |                |

## offers

Created offers

### Properties

| Property  | Type               | Required | Description    |
|-----------|--------------------|----------|----------------|
| `custom`  | [object](#custom)  | No       | Created offers |
| `local`   | [object](#local)   | No       | Created offers |
| `mainnet` | [object](#mainnet) | No       | Created offers |
| `stage`   | [object](#stage)   | No       | Created offers |
| `testnet` | [object](#testnet) | No       | Created offers |

### custom

Created offers

#### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `noxName` | [object](#noxname) | No       |             |

#### noxName

##### Properties

| Property          | Type   | Required | Description      |
|-------------------|--------|----------|------------------|
| `id`              | string | **Yes**  | Offer id         |
| `providerAddress` | string | **Yes**  | Provider address |

### local

Created offers

#### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `noxName` | [object](#noxname) | No       |             |

#### noxName

##### Properties

| Property          | Type   | Required | Description      |
|-------------------|--------|----------|------------------|
| `id`              | string | **Yes**  | Offer id         |
| `providerAddress` | string | **Yes**  | Provider address |

### mainnet

Created offers

#### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `noxName` | [object](#noxname) | No       |             |

#### noxName

##### Properties

| Property          | Type   | Required | Description      |
|-------------------|--------|----------|------------------|
| `id`              | string | **Yes**  | Offer id         |
| `providerAddress` | string | **Yes**  | Provider address |

### stage

Created offers

#### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `noxName` | [object](#noxname) | No       |             |

#### noxName

##### Properties

| Property          | Type   | Required | Description      |
|-------------------|--------|----------|------------------|
| `id`              | string | **Yes**  | Offer id         |
| `providerAddress` | string | **Yes**  | Provider address |

### testnet

Created offers

#### Properties

| Property  | Type               | Required | Description |
|-----------|--------------------|----------|-------------|
| `noxName` | [object](#noxname) | No       |             |

#### noxName

##### Properties

| Property          | Type   | Required | Description      |
|-------------------|--------|----------|------------------|
| `id`              | string | **Yes**  | Offer id         |
| `providerAddress` | string | **Yes**  | Provider address |

