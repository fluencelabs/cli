# provider-secrets.yaml

Defines secrets config used for provider set up

## Properties

| Property  | Type             | Required | Description                   |
|-----------|------------------|----------|-------------------------------|
| `noxes`   | [object](#noxes) | **Yes**  | Secret keys for noxes by name |
| `version` | number           | **Yes**  | Config version                |

## noxes

Secret keys for noxes by name

### Properties

| Property  | Type               | Required | Description                                                                      |
|-----------|--------------------|----------|----------------------------------------------------------------------------------|
| `noxName` | [object](#noxname) | No       | Secret keys for noxes. You can put it near provider config and populate it in CI |

### noxName

Secret keys for noxes. You can put it near provider config and populate it in CI

#### Properties

| Property        | Type   | Required | Description                                               |
|-----------------|--------|----------|-----------------------------------------------------------|
| `networkKey`    | string | **Yes**  | Network key for the nox                                   |
| `signingWallet` | string | **Yes**  | Signing wallet for built-in decider system service in nox |

