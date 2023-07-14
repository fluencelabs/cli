# user-secrets.yaml

Defines user's secret keys that can be used across different Fluence projects. You can manage user's keys using commands from `Fluence CLI key` group of commands with `--user` flag

## Properties

| Property             | Type                  | Required | Description |
|----------------------|-----------------------|----------|-------------|
| `defaultKeyPairName` | string                | **Yes**  |             |
| `keyPairs`           | [object](#keypairs)[] | **Yes**  |             |
| `version`            | number                | **Yes**  |             |

## keyPairs

### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `name`      | string | **Yes**  |             |
| `secretKey` | string | **Yes**  |             |

