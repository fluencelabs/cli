## clock Type

`object` ([Details](fluence-properties-spells-additionalproperties-properties-clock.md))

# clock Properties

| Property                          | Type     | Required | Nullable       | Defined by                                                                                                                                                                                                                                 |
| :-------------------------------- | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [periodSec](#periodsec)           | `number` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-periodsec.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/periodSec")           |
| [startTimestamp](#starttimestamp) | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-starttimestamp.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/startTimestamp") |
| [endTimestamp](#endtimestamp)     | `string` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-endtimestamp.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/endTimestamp")     |
| [startDelaySec](#startdelaysec)   | `number` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-startdelaysec.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/startDelaySec")   |
| [endDelaySec](#enddelaysec)       | `number` | Optional | cannot be null | [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-enddelaysec.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/endDelaySec")       |

## periodSec

How often the spell will be executed. If set to 0, the spell will be executed only once. If this value not provided at all - the spell will never be executed

`periodSec`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-periodsec.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/periodSec")

### periodSec Type

`number`

### periodSec Constraints

**maximum**: the value of this number must smaller than or equal to: `3153600000`

**minimum**: the value of this number must greater than or equal to: `0`

## startTimestamp

An ISO timestamp when the periodic execution should start. If this property or `startDelaySec` not specified, periodic execution will start immediately. If it is set to 0 - the spell will never be executed

`startTimestamp`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-starttimestamp.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/startTimestamp")

### startTimestamp Type

`string`

## endTimestamp

An ISO timestamp when the periodic execution should end. If this property or `endDelaySec` not specified, periodic execution will never end. If it is in the past at the moment of spell creation on Rust peer - the spell will never be executed

`endTimestamp`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-endtimestamp.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/endTimestamp")

### endTimestamp Type

`string`

## startDelaySec

How long to wait before the first execution in seconds. If this property or `startTimestamp` not specified, periodic execution will start immediately. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. This property conflicts with `startTimestamp`. You can specify only one of them

`startDelaySec`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-startdelaysec.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/startDelaySec")

### startDelaySec Type

`number`

### startDelaySec Constraints

**maximum**: the value of this number must smaller than or equal to: `4294967295`

**minimum**: the value of this number must greater than or equal to: `0`

## endDelaySec

How long to wait before the last execution in seconds. If this property or `endTimestamp` not specified, periodic execution will never end. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. If it is in the past at the moment of spell creation - the spell will never be executed. This property conflicts with `endTimestamp`. You can specify only one of them

`endDelaySec`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-spells-additionalproperties-properties-clock-properties-enddelaysec.md "https://fluence.dev/schemas/fluence.yaml#/properties/spells/additionalProperties/properties/clock/properties/endDelaySec")

### endDelaySec Type

`number`

### endDelaySec Constraints

**maximum**: the value of this number must smaller than or equal to: `4294967295`

**minimum**: the value of this number must greater than or equal to: `0`
