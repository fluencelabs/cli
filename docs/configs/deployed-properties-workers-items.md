## items Type

`object` ([Details](deployed-properties-workers-items.md))

# items Properties

| Property                                     | Type     | Required | Nullable       | Defined by                                                                                                                                                                                |
| :------------------------------------------- | :------- | :------- | :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [name](#name)                                | `string` | Required | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-name.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/name")                               |
| [installation\_spells](#installation_spells) | `array`  | Required | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-installation_spells.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/installation_spells") |
| [definition](#definition)                    | `string` | Required | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-definition.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/definition")                   |
| [workerCID](#workercid)                      | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-workercid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/workerCID")                     |
| [dealAddress](#dealaddress)                  | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-dealaddress.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/dealAddress")                 |
| [network](#network)                          | `string` | Optional | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-network.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/network")                         |
| [timestamp](#timestamp)                      | `string` | Required | cannot be null | [deployed.yaml](deployed-properties-workers-items-properties-timestamp.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/timestamp")                     |

## name



`name`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-name.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/name")

### name Type

`string`

## installation\_spells

A list of installation spells

`installation_spells`

*   is required

*   Type: `object[]` ([Details](deployed-properties-workers-items-properties-installation_spells-items.md))

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-installation_spells.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/installation_spells")

### installation\_spells Type

`object[]` ([Details](deployed-properties-workers-items-properties-installation_spells-items.md))

## definition



`definition`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-definition.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/definition")

### definition Type

`string`

## workerCID



`workerCID`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-workercid.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/workerCID")

### workerCID Type

`string`

## dealAddress



`dealAddress`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-dealaddress.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/dealAddress")

### dealAddress Type

`string`

## network



`network`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-network.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/network")

### network Type

`string`

### network Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"local"`   |             |
| `"testnet"` |             |

## timestamp

ISO timestamp of the time when the worker was deployed

`timestamp`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed.yaml](deployed-properties-workers-items-properties-timestamp.md "https://fluence.dev/schemas/deployed.yaml#/properties/workers/items/properties/timestamp")

### timestamp Type

`string`
