# project-secrets.yaml

Defines project's secret keys that are used only in the scope of this particular Fluence project. You can manage project's keys using commands from `flox key` group of commands

## Properties

| Property             | Type                  | Required | Description                                                                                                                                       |
|----------------------|-----------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `keyPairs`           | [object](#keypairs)[] | **Yes**  | Key Pairs available for the particular project                                                                                                    |
| `version`            | number                | **Yes**  |                                                                                                                                                   |
| `defaultKeyPairName` | string                | No       | Key pair with this name will be used for the deployment by default. You can override it with flags or by using keyPair properties in fluence.yaml |

## keyPairs

### Properties

| Property    | Type   | Required | Description |
|-------------|--------|----------|-------------|
| `name`      | string | **Yes**  |             |
| `secretKey` | string | **Yes**  |             |

