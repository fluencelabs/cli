## workers.yaml Type

`object` ([workers.yaml](workers.md))

# workers.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                   |
| :------------------ | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------- |
| [version](#version) | `number` | Required | cannot be null | [workers.yaml](workers-properties-version.md "https://fluence.dev/schemas/workers.yaml#/properties/version") |
| [deals](#deals)     | `object` | Optional | cannot be null | [workers.yaml](workers-properties-deals.md "https://fluence.dev/schemas/workers.yaml#/properties/deals")     |
| [hosts](#hosts)     | `object` | Optional | cannot be null | [workers.yaml](workers-properties-hosts.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts")     |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-version.md "https://fluence.dev/schemas/workers.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```

## deals

A map of created deals

`deals`

*   is optional

*   Type: `object` ([Details](workers-properties-deals.md))

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals.md "https://fluence.dev/schemas/workers.yaml#/properties/deals")

### deals Type

`object` ([Details](workers-properties-deals.md))

## hosts

A map of deployed workers

`hosts`

*   is optional

*   Type: `object` ([Details](workers-properties-hosts.md))

*   cannot be null

*   defined in: [workers.yaml](workers-properties-hosts.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts")

### hosts Type

`object` ([Details](workers-properties-hosts.md))
