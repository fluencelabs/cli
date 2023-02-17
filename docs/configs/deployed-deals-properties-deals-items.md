## items Type

`object` ([Details](deployed-deals-properties-deals-items.md))

# items Properties

| Property                    | Type     | Required | Nullable       | Defined by                                                                                                                                                                              |
| :-------------------------- | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [workerName](#workername)   | `string` | Required | cannot be null | [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-workername.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/workerName")   |
| [workerCID](#workercid)     | `string` | Required | cannot be null | [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-workercid.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/workerCID")     |
| [dealAddress](#dealaddress) | `string` | Required | cannot be null | [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-dealaddress.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/dealAddress") |
| [network](#network)         | `string` | Required | cannot be null | [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-network.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/network")         |
| [timestamp](#timestamp)     | `string` | Required | cannot be null | [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-timestamp.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/timestamp")     |

## workerName



`workerName`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-workername.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/workerName")

### workerName Type

`string`

## workerCID



`workerCID`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-workercid.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/workerCID")

### workerCID Type

`string`

## dealAddress



`dealAddress`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-dealaddress.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/dealAddress")

### dealAddress Type

`string`

## network



`network`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-network.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/network")

### network Type

`string`

### network Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value       | Explanation |
| :---------- | :---------- |
| `"local"`   |             |
| `"testnet"` |             |

## timestamp

ISO timestamp of the time when the deal was deployed

`timestamp`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-deals-items-properties-timestamp.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals/items/properties/timestamp")

### timestamp Type

`string`
