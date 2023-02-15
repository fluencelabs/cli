## deployed.yaml Type

`object` ([deployed.yaml](deployed.md))

# deployed.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                      |
| :------------------ | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------- |
| [version](#version) | `number` | Required | cannot be null | [deployed.yaml](deployed-properties-version.md "https://fluence.dev/schemas/deployed.yaml#/properties/version") |
| [workers](#workers) | `array`  | Optional | cannot be null | [deployed.yaml](deployed-properties-workers.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers") |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-version.md "https://fluence.dev/schemas/deployed.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```

## workers

A list of deployed workers

`workers`

*   is optional

*   Type: `object[]` ([Details](deployed-properties-workers-items.md))

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers")

### workers Type

`object[]` ([Details](deployed-properties-workers-items.md))
