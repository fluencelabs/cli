## workers.yaml Type

`object` ([workers.yaml](workers.md))

# workers.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                   |
| :------------------ | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------- |
| [workers](#workers) | `object` | Required | cannot be null | [workers.yaml](workers-properties-workers.md "https://fluence.dev/schemas/workers.yaml#/properties/workers") |
| [version](#version) | `number` | Required | cannot be null | [workers.yaml](workers-properties-version.md "https://fluence.dev/schemas/workers.yaml#/properties/version") |

## workers

A Map with worker names as keys and worker configs as values

`workers`

*   is required

*   Type: `object` ([Details](workers-properties-workers.md))

*   cannot be null

*   defined in: [workers.yaml](workers-properties-workers.md "https://fluence.dev/schemas/workers.yaml#/properties/workers")

### workers Type

`object` ([Details](workers-properties-workers.md))

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-version.md "https://fluence.dev/schemas/workers.yaml#/properties/version")

### version Type

`number`

### version Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value | Explanation |
| :---- | :---------- |
| `0`   |             |
