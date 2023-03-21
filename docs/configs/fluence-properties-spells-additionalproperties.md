## additionalProperties Type

`object` ([Details](fluence-properties-spells-additionalproperties.md))

# additionalProperties Properties

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                                                                                                           |
| :---------------------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [get](#get)                   | `string` | Required | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-get.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/get")                   |
| [version](#version)           | `number` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-version.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/version")           |
| [aquaFilePath](#aquafilepath) | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-aquafilepath.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/aquaFilePath") |
| [function](#function)         | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-function.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/function")         |
| [initArgs](#initargs)         | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-initargs.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/initArgs")         |
| [clock](#clock)               | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock")               |

## get

Path to spell

`get`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-get.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/get")

### get Type

`string`

## version



`version`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-version.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```

## aquaFilePath

Path to Aqua file which contains an Aqua function that you want to use as a spell

`aquaFilePath`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-aquafilepath.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/aquaFilePath")

### aquaFilePath Type

`string`

## function

Name of the Aqua function that you want to use as a spell

`function`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-function.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/function")

### function Type

`string`

## initArgs

A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function. Also they will be stored in the key-value storage for this particular spell. It's possible to change argument values inside the spell itself if you return a new map of new arguments from the spell function. Also it's possible to update these values from another spell using Spell.set\_string method

`initArgs`

*   is optional

*   Type: `object` ([Details](fluence-properties-spells-additionalproperties-properties-initargs.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-initargs.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/initArgs")

### initArgs Type

`object` ([Details](fluence-properties-spells-additionalproperties-properties-initargs.md))

## clock

Trigger the spell execution periodically. If you want to disable this property by overriding it in fluence.yaml - pass empty config for it like this: `clock: {}`

`clock`

*   is optional

*   Type: `object` ([Details](fluence-properties-spells-additionalproperties-properties-clock.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock")

### clock Type

`object` ([Details](fluence-properties-spells-additionalproperties-properties-clock.md))
