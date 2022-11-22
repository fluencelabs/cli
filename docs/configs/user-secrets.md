## user-secrets.yaml Type

`object` ([user-secrets.yaml](user-secrets.md))

# user-secrets.yaml Properties

| Property                                  | Type     | Required | Nullable       | Defined by                                                                                                                                        |
| :---------------------------------------- | :------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ |
| [defaultKeyPairName](#defaultkeypairname) | `string` | Required | cannot be null | [user-secrets.yaml](user-secrets-properties-defaultkeypairname.md "https://fluence.dev/schemas/user-secrets.yaml#/properties/defaultKeyPairName") |
| [keyPairs](#keypairs)                     | `array`  | Required | cannot be null | [user-secrets.yaml](user-secrets-properties-key-pairs.md "https://fluence.dev/schemas/user-secrets.yaml#/properties/keyPairs")                    |
| [version](#version)                       | `number` | Required | cannot be null | [user-secrets.yaml](user-secrets-properties-version.md "https://fluence.dev/schemas/user-secrets.yaml#/properties/version")                       |

## defaultKeyPairName



`defaultKeyPairName`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [user-secrets.yaml](user-secrets-properties-defaultkeypairname.md "https://fluence.dev/schemas/user-secrets.yaml#/properties/defaultKeyPairName")

### defaultKeyPairName Type

`string`

## keyPairs



`keyPairs`

*   is required

*   Type: `object[]` ([Key Pair](user-secrets-properties-key-pairs-key-pair.md))

*   cannot be null

*   defined in: [user-secrets.yaml](user-secrets-properties-key-pairs.md "https://fluence.dev/schemas/user-secrets.yaml#/properties/keyPairs")

### keyPairs Type

`object[]` ([Key Pair](user-secrets-properties-key-pairs-key-pair.md))

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [user-secrets.yaml](user-secrets-properties-version.md "https://fluence.dev/schemas/user-secrets.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```
