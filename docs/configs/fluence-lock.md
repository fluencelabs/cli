## fluence-lock.yaml Type

`object` ([fluence-lock.yaml](fluence-lock.md))

# fluence-lock.yaml Properties

| Property            | Type     | Required | Nullable       | Defined by                                                                                                                           |
| :------------------ | :------- | :------- | :------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| [npm](#npm)         | `object` | Optional | cannot be null | [fluence-lock.yaml](fluence-lock-properties-npm-dependencies.md "https://fluence.dev/schemas/fluence-lock.yaml#/properties/npm")     |
| [cargo](#cargo)     | `object` | Optional | cannot be null | [fluence-lock.yaml](fluence-lock-properties-cargo-dependencies.md "https://fluence.dev/schemas/fluence-lock.yaml#/properties/cargo") |
| [version](#version) | `number` | Required | cannot be null | [fluence-lock.yaml](fluence-lock-properties-version.md "https://fluence.dev/schemas/fluence-lock.yaml#/properties/version")          |

## npm

A map of the exact npm dependency versions. CLI ensures dependencies are installed each time you run aqua

`npm`

*   is optional

*   Type: `object` ([npm dependencies](fluence-lock-properties-npm-dependencies.md))

*   cannot be null

*   defined in: [fluence-lock.yaml](fluence-lock-properties-npm-dependencies.md "https://fluence.dev/schemas/fluence-lock.yaml#/properties/npm")

### npm Type

`object` ([npm dependencies](fluence-lock-properties-npm-dependencies.md))

## cargo

A map of the exact cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL

`cargo`

*   is optional

*   Type: `object` ([Cargo dependencies](fluence-lock-properties-cargo-dependencies.md))

*   cannot be null

*   defined in: [fluence-lock.yaml](fluence-lock-properties-cargo-dependencies.md "https://fluence.dev/schemas/fluence-lock.yaml#/properties/cargo")

### cargo Type

`object` ([Cargo dependencies](fluence-lock-properties-cargo-dependencies.md))

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [fluence-lock.yaml](fluence-lock-properties-version.md "https://fluence.dev/schemas/fluence-lock.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```
