## additionalProperties Type

`object` ([Details](deployed-properties-workers-additionalproperties.md))

# additionalProperties Properties

| Property                                     | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                              |
| :------------------------------------------- | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [installation\_spells](#installation_spells) | `array`  | Required | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-installation_spells.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/installation_spells") |
| [definition](#definition)                    | `string` | Required | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-definition.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/definition")                   |
| [workerCID](#workercid)                      | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-workercid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/workerCID")                     |
| [dealId](#dealid)                            | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-dealid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/dealId")                           |
| [dealIdOriginal](#dealidoriginal)            | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-dealidoriginal.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/dealIdOriginal")           |
| [chainNetwork](#chainnetwork)                | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-chainnetwork.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/chainNetwork")               |
| [chainNetworkId](#chainnetworkid)            | `number` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-chainnetworkid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/chainNetworkId")           |
| [timestamp](#timestamp)                      | `string` | Required | cannot be null | [deployed.yaml](deployed-properties-workers-additionalproperties-properties-timestamp.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/timestamp")                     |

## installation\_spells

A list of installation spells

`installation_spells`

*   is required

*   Type: `object[]` ([Details](deployed-properties-workers-additionalproperties-properties-installation_spells-items.md))

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-installation_spells.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/installation_spells")

### installation\_spells Type

`object[]` ([Details](deployed-properties-workers-additionalproperties-properties-installation_spells-items.md))

## definition



`definition`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-definition.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/definition")

### definition Type

`string`

## workerCID



`workerCID`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-workercid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/workerCID")

### workerCID Type

`string`

## dealId



`dealId`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-dealid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/dealId")

### dealId Type

`string`

## dealIdOriginal



`dealIdOriginal`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-dealidoriginal.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/dealIdOriginal")

### dealIdOriginal Type

`string`

## chainNetwork



`chainNetwork`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-chainnetwork.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/chainNetwork")

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

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-chainnetworkid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/chainNetworkId")

### chainNetworkId Type

`number`

## timestamp

ISO timestamp of the time when the worker was deployed

`timestamp`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-additionalproperties-properties-timestamp.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/additionalProperties/properties/timestamp")

### timestamp Type

`string`
