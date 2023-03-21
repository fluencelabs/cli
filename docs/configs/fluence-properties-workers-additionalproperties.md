## additionalProperties Type

`object` ([Details](fluence-properties-workers-additionalproperties.md))

# additionalProperties Properties

| Property              | Type    | Required | Nullable       | Defined by                                                                                                                                                                                     |
| :-------------------- | :------ | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [services](#services) | `array` | Optional | cannot be null | [fluence.yaml](fluence-properties-workers-additionalproperties-properties-services.md "https://fluence.dev/schemas/fluence.yaml#/properties/workers/additionalProperties/properties/services") |
| [spells](#spells)     | `array` | Optional | cannot be null | [fluence.yaml](fluence-properties-workers-additionalproperties-properties-spells.md "https://fluence.dev/schemas/fluence.yaml#/properties/workers/additionalProperties/properties/spells")     |

## services

An array of service names to include in this worker. Service names must be listed in fluence.yaml

`services`

*   is optional

*   Type: `string[]`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-workers-additionalproperties-properties-services.md "https://fluence.dev/schemas/fluence.yaml#/properties/workers/additionalProperties/properties/services")

### services Type

`string[]`

## spells

An array of spell names to include in this worker. Spell names must be listed in fluence.yaml

`spells`

*   is optional

*   Type: `string[]`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-workers-additionalproperties-properties-spells.md "https://fluence.dev/schemas/fluence.yaml#/properties/workers/additionalProperties/properties/spells")

### spells Type

`string[]`
