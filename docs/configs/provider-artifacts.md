# provider-artifacts.yaml

Defines artifacts created by the provider

## Properties

| Property  | Type              | Required | Description    |
|-----------|-------------------|----------|----------------|
| `offers`  | [object](#offers) | **Yes**  | Created offers |
| `version` | number            | **Yes**  | Config version |

## offers

Created offers

### Properties

| Property  | Type               | Required | Description        |
|-----------|--------------------|----------|--------------------|
| `noxName` | [object](#noxname) | No       | Created offer info |

### noxName

Created offer info

#### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `id`     | string | **Yes**  | Offer id    |

