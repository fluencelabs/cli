## additionalProperties Type

`object` ([Details](workers-properties-hosts-additionalproperties.md))

# additionalProperties Properties

| Property                                     | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                       |
| :------------------------------------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [definition](#definition)                    | `string` | Required | cannot be null | [workers.yaml](workers-properties-hosts-additionalproperties-properties-definition.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/definition")                   |
| [timestamp](#timestamp)                      | `string` | Required | cannot be null | [workers.yaml](workers-properties-hosts-additionalproperties-properties-timestamp.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/timestamp")                     |
| [installation\_spells](#installation_spells) | `array`  | Required | cannot be null | [workers.yaml](workers-properties-hosts-additionalproperties-properties-installation_spells.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/installation_spells") |
| [relayId](#relayid)                          | `string` | Required | cannot be null | [workers.yaml](workers-properties-hosts-additionalproperties-properties-relayid.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/relayId")                         |

## definition



`definition`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-hosts-additionalproperties-properties-definition.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/definition")

### definition Type

`string`

## timestamp

ISO timestamp of the time when the worker was deployed

`timestamp`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-hosts-additionalproperties-properties-timestamp.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/timestamp")

### timestamp Type

`string`

## installation\_spells

A list of installation spells

`installation_spells`

*   is required

*   Type: `object[]` ([Details](workers-properties-hosts-additionalproperties-properties-installation_spells-items.md))

*   cannot be null

*   defined in: [workers.yaml](workers-properties-hosts-additionalproperties-properties-installation_spells.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/installation_spells")

### installation\_spells Type

`object[]` ([Details](workers-properties-hosts-additionalproperties-properties-installation_spells-items.md))

## relayId



`relayId`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [workers.yaml](workers-properties-hosts-additionalproperties-properties-relayid.md "https://fluence.dev/schemas/workers.yaml#/properties/hosts/additionalProperties/properties/relayId")

### relayId Type

`string`
