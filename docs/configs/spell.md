# spell.yaml

Defines a spell. You can use `fluence spell new` command to generate a template for new spell

## Properties

| Property       | Type                | Required | Description                                                                                                                                                                                     |
|----------------|---------------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `aquaFilePath` | string              | **Yes**  | Path to Aqua file which contains an Aqua function that you want to use as a spell                                                                                                               |
| `function`     | string              | **Yes**  | Name of the Aqua function that you want to use as a spell                                                                                                                                       |
| `version`      | number              | **Yes**  |                                                                                                                                                                                                 |
| `clock`        | [object](#clock)    | No       | Trigger the spell execution periodically. If you want to disable this property by overriding it in fluence.yaml - pass empty config for it like this: `clock: {}`                               |
| `initArgs`     | [object](#initargs) | No       | A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function and will be stored in the key-value storage for this particular spell. |

## clock

Trigger the spell execution periodically. If you want to disable this property by overriding it in fluence.yaml - pass empty config for it like this: `clock: {}`

### Properties

| Property         | Type   | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                                    |
|------------------|--------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `endDelaySec`    | number | No       | How long to wait before the last execution in seconds. If this property or `endTimestamp` not specified, periodic execution will never end. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. If it is in the past at the moment of spell creation - the spell will never be executed. This property conflicts with `endTimestamp`. You can specify only one of them |
| `endTimestamp`   | string | No       | An ISO timestamp when the periodic execution should end. If this property or `endDelaySec` not specified, periodic execution will never end. If it is in the past at the moment of spell creation on Rust peer - the spell will never be executed                                                                                                                                                                              |
| `periodSec`      | number | No       | How often the spell will be executed. If set to 0, the spell will be executed only once. If this value not provided at all - the spell will never be executed                                                                                                                                                                                                                                                                  |
| `startDelaySec`  | number | No       | How long to wait before the first execution in seconds. If this property or `startTimestamp` not specified, periodic execution will start immediately. WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server. This property conflicts with `startTimestamp`. You can specify only one of them                                                                             |
| `startTimestamp` | string | No       | An ISO timestamp when the periodic execution should start. If this property or `startDelaySec` not specified, periodic execution will start immediately. If it is set to 0 - the spell will never be executed                                                                                                                                                                                                                  |

## initArgs

A map of Aqua function arguments names as keys and arguments values as values. They will be passed to the spell function and will be stored in the key-value storage for this particular spell.


