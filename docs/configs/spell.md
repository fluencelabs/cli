## spell.yaml Type

`object` ([spell.yaml](spell.md))

# spell.yaml Properties

| Property                      | Type     | Required | Nullable       | Defined by                                                                                                       |
| :---------------------------- | :------- | :------- | :------------- | :--------------------------------------------------------------------------------------------------------------- |
| [version](#version)           | `number` | Required | cannot be null | [spell.yaml](spell-properties-version.md "https://fluence.dev/schemas/spell.yaml#/properties/version")           |
| [aquaFilePath](#aquafilepath) | `string` | Required | cannot be null | [spell.yaml](spell-properties-aquafilepath.md "https://fluence.dev/schemas/spell.yaml#/properties/aquaFilePath") |
| [function](#function)         | `string` | Required | cannot be null | [spell.yaml](spell-properties-function.md "https://fluence.dev/schemas/spell.yaml#/properties/function")         |
| [initArgs](#initargs)         | `object` | Optional | cannot be null | [spell.yaml](spell-properties-initargs.md "https://fluence.dev/schemas/spell.yaml#/properties/initArgs")         |
| [clock](#clock)               | `object` | Optional | cannot be null | [spell.yaml](spell-properties-clock.md "https://fluence.dev/schemas/spell.yaml#/properties/clock")               |

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [spell.yaml](spell-properties-version.md "https://fluence.dev/schemas/spell.yaml#/properties/version")

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

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [spell.yaml](spell-properties-aquafilepath.md "https://fluence.dev/schemas/spell.yaml#/properties/aquaFilePath")

### aquaFilePath Type

`string`

## function

Name of the Aqua function that you want to use as a spell

`function`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [spell.yaml](spell-properties-function.md "https://fluence.dev/schemas/spell.yaml#/properties/function")

### function Type

`string`

## initArgs

A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function and will be stored in the key-value storage for this particular spell.

`initArgs`

*   is optional

*   Type: `object` ([Details](spell-properties-initargs.md))

*   cannot be null

*   defined in: [spell.yaml](spell-properties-initargs.md "https://fluence.dev/schemas/spell.yaml#/properties/initArgs")

### initArgs Type

`object` ([Details](spell-properties-initargs.md))

## clock

Trigger the spell execution periodically. If you want to disable this property by overriding it in fluence.yaml - pass empty config for it like this: `clock: {}`

`clock`

*   is optional

*   Type: `object` ([Details](spell-properties-clock.md))

*   cannot be null

*   defined in: [spell.yaml](spell-properties-clock.md "https://fluence.dev/schemas/spell.yaml#/properties/clock")

### clock Type

`object` ([Details](spell-properties-clock.md))
