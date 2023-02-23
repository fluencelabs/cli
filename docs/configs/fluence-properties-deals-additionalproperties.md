## additionalProperties Type

`object` ([Details](fluence-properties-deals-additionalproperties.md))

# additionalProperties Properties

| Property                        | Type     | Required | Nullable       | Defined by                                                                                                                                                                                           |
| :------------------------------ | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [minWorkers](#minworkers)       | `number` | Optional | cannot be null | [fluence.yaml](fluence-properties-deals-additionalproperties-properties-minworkers.md "https://fluence.dev/schemas/fluence.yaml#/properties/deals/additionalProperties/properties/minWorkers")       |
| [targetWorkers](#targetworkers) | `number` | Optional | cannot be null | [fluence.yaml](fluence-properties-deals-additionalproperties-properties-targetworkers.md "https://fluence.dev/schemas/fluence.yaml#/properties/deals/additionalProperties/properties/targetWorkers") |

## minWorkers

Required workers to activate the deal

`minWorkers`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-deals-additionalproperties-properties-minworkers.md "https://fluence.dev/schemas/fluence.yaml#/properties/deals/additionalProperties/properties/minWorkers")

### minWorkers Type

`number`

### minWorkers Constraints

**minimum**: the value of this number must greater than or equal to: `1`

### minWorkers Default Value

The default value is:

```json
1
```

## targetWorkers

Max workers in the deal

`targetWorkers`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-deals-additionalproperties-properties-targetworkers.md "https://fluence.dev/schemas/fluence.yaml#/properties/deals/additionalProperties/properties/targetWorkers")

### targetWorkers Type

`number`

### targetWorkers Constraints

**minimum**: the value of this number must greater than or equal to: `1`

### targetWorkers Default Value

The default value is:

```json
3
```
