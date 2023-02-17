## deployed-deals.yaml Type

`object` ([deployed-deals.yaml](deployed-deals.md))

# deployed-deals.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                                        |
| :------------------ | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| [version](#version) | `number` | Required | cannot be null | [deployed-deals.yaml](deployed-deals-properties-version.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/version") |
| [deals](#deals)     | `array`  | Optional | cannot be null | [deployed-deals.yaml](deployed-deals-properties-deals.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals")     |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-version.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```

## deals

A list of deployed deals

`deals`

*   is optional

*   Type: `object[]` ([Details](deployed-deals-properties-deals-items.md))

*   cannot be null

*   defined in: [deployed-deals.yaml](deployed-deals-properties-deals.md "https://fluence.dev/schemas/deployed-deals.yaml#/properties/deals")

### deals Type

`object[]` ([Details](deployed-deals-properties-deals-items.md))
