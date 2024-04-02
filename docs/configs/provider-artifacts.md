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

| Property  | Type               | Required | Description        |
|-----------|--------------------|----------|--------------------|
| `noxName` | [object](#noxname) | No       | Created offer info |

#### noxName

Created offer info

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `id`     | string | **Yes**  | Offer id    |

### dar

Created offers

#### Properties

| Property  | Type               | Required | Description        |
|-----------|--------------------|----------|--------------------|
| `noxName` | [object](#noxname) | No       | Created offer info |

#### noxName

Created offer info

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `id`     | string | **Yes**  | Offer id    |

### kras

Created offers

#### Properties

| Property  | Type               | Required | Description        |
|-----------|--------------------|----------|--------------------|
| `noxName` | [object](#noxname) | No       | Created offer info |

#### noxName

Created offer info

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `id`     | string | **Yes**  | Offer id    |

### local

Created offers

#### Properties

| Property  | Type               | Required | Description        |
|-----------|--------------------|----------|--------------------|
| `noxName` | [object](#noxname) | No       | Created offer info |

#### noxName

Created offer info

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `id`     | string | **Yes**  | Offer id    |

### stage

Created offers

#### Properties

| Property  | Type               | Required | Description        |
|-----------|--------------------|----------|--------------------|
| `noxName` | [object](#noxname) | No       | Created offer info |

#### noxName

Created offer info

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `id`     | string | **Yes**  | Offer id    |

