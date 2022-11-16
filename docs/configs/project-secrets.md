## project-secrets.yaml Type

`object` ([project-secrets.yaml](project-secrets.md))

# project-secrets.yaml Properties

| Property                                  | Type     | Required | Nullable       | Defined by                                                                                                                                                 |
| :---------------------------------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [version](#version)                       | `number` | Required | cannot be null | [project-secrets.yaml](project-secrets-properties-version.md "https://fluence.dev/schemas/project-secrets.yaml#/properties/version")                       |
| [keyPairs](#keypairs)                     | `array`  | Required | cannot be null | [project-secrets.yaml](project-secrets-properties-key-pairs.md "https://fluence.dev/schemas/project-secrets.yaml#/properties/keyPairs")                    |
| [defaultKeyPairName](#defaultkeypairname) | `string` | Optional | cannot be null | [project-secrets.yaml](project-secrets-properties-defaultkeypairname.md "https://fluence.dev/schemas/project-secrets.yaml#/properties/defaultKeyPairName") |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [project-secrets.yaml](project-secrets-properties-version.md "https://fluence.dev/schemas/project-secrets.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```

## keyPairs

Key Pairs available for the particular project

`keyPairs`

*   is required

*   Type: `object[]` ([Key Pair](project-secrets-properties-key-pairs-key-pair.md))

*   cannot be null

*   defined in: [project-secrets.yaml](project-secrets-properties-key-pairs.md "https://fluence.dev/schemas/project-secrets.yaml#/properties/keyPairs")

### keyPairs Type

`object[]` ([Key Pair](project-secrets-properties-key-pairs-key-pair.md))

## defaultKeyPairName

Key pair with this name will be used for the deployment by default. You can override it with flags or by using keyPair properties in fluence.yaml

`defaultKeyPairName`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [project-secrets.yaml](project-secrets-properties-defaultkeypairname.md "https://fluence.dev/schemas/project-secrets.yaml#/properties/defaultKeyPairName")

### defaultKeyPairName Type

`string`
