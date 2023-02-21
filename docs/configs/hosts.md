## hosts.yaml Type

`object` ([hosts.yaml](hosts.md))

# hosts.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                             |
| :------------------ | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------- |
| [hosts](#hosts)     | `array`  | Required | cannot be null | [hosts.yaml](hosts-properties-hosts.md "https://fluence.dev/schemas/hosts.yaml#/properties/hosts")     |
| [version](#version) | `number` | Required | cannot be null | [hosts.yaml](hosts-properties-version.md "https://fluence.dev/schemas/hosts.yaml#/properties/version") |

## hosts

Array of objects, each object defines a worker and a list of peer IDs to host it on

`hosts`

*   is required

*   Type: `object[]` ([Details](hosts-properties-hosts-items.md))

*   cannot be null

*   defined in: [hosts.yaml](hosts-properties-hosts.md "https://fluence.dev/schemas/hosts.yaml#/properties/hosts")

### hosts Type

`object[]` ([Details](hosts-properties-hosts-items.md))

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [hosts.yaml](hosts-properties-version.md "https://fluence.dev/schemas/hosts.yaml#/properties/version")

### version Type

`number`

### version Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value | Explanation |
| :---- | :---------- |
| `0`   |             |
