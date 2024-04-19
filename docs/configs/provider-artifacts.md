# provider-artifacts.yaml

Defines artifacts created by the provider

## Properties

| Property  | Type              | Required | Description    |
|-----------|-------------------|----------|----------------|
| `offers`  | [object](#offers) | **Yes**  | Created offers |
| `version` | integer           | **Yes**  | Config version |

## offers

Created offers

### Properties

| Property | Type              | Required | Description    |
|----------|-------------------|----------|----------------|
| `custom` | [object](#custom) | No       | Created offers |
| `dar`    | [object](#dar)    | No       | Created offers |
| `kras`   | [object](#kras)   | No       | Created offers |
| `local`  | [object](#local)  | No       | Created offers |
| `stage`  | [object](#stage)  | No       | Created offers |

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

### dar

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

### kras

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

