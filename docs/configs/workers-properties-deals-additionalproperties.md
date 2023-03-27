## additionalProperties Type

`object` ([Details](workers-properties-deals-additionalproperties.md))

# additionalProperties Properties

| Property                          | Type     | Required | Nullable       | Defined by                                                                                                                                                                                             |
| :-------------------------------- | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [definition](#definition)         | `string` | Required | cannot be null | [workers.yaml](workers-properties-deals-additionalproperties-properties-definition.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/definition")         |
| [timestamp](#timestamp)           | `string` | Required | cannot be null | [workers.yaml](workers-properties-deals-additionalproperties-properties-timestamp.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/timestamp")           |
| [dealId](#dealid)                 | `string` | Required | cannot be null | [workers.yaml](workers-properties-deals-additionalproperties-properties-dealid.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/dealId")                 |
| [dealIdOriginal](#dealidoriginal) | `string` | Required | cannot be null | [workers.yaml](workers-properties-deals-additionalproperties-properties-dealidoriginal.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/dealIdOriginal") |
| [chainNetwork](#chainnetwork)     | `string` | Required | cannot be null | [workers.yaml](workers-properties-deals-additionalproperties-properties-chainnetwork.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/chainNetwork")     |
| [chainNetworkId](#chainnetworkid) | `number` | Required | cannot be null | [workers.yaml](workers-properties-deals-additionalproperties-properties-chainnetworkid.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/chainNetworkId") |

## definition



`definition`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals-additionalproperties-properties-definition.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/definition")

### definition Type

`string`

## timestamp

ISO timestamp of the time when the worker was deployed

`timestamp`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals-additionalproperties-properties-timestamp.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/timestamp")

### timestamp Type

`string`

## dealId



`dealId`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals-additionalproperties-properties-dealid.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/dealId")

### dealId Type

`string`

## dealIdOriginal



`dealIdOriginal`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals-additionalproperties-properties-dealidoriginal.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/dealIdOriginal")

### dealIdOriginal Type

`string`

## chainNetwork



`chainNetwork`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals-additionalproperties-properties-chainnetwork.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/chainNetwork")

### chainNetwork Type

`string`

### chainNetwork Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"local"`   |             |
| `"testnet"` |             |

## chainNetworkId



`chainNetworkId`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-deals-additionalproperties-properties-chainnetworkid.md "https://fluence.dev/schemas/workers.yaml#/properties/deals/additionalProperties/properties/chainNetworkId")

### chainNetworkId Type

`number`
