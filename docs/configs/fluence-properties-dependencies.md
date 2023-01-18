## dependencies Type

`object` ([Dependencies](fluence-properties-dependencies.md))

# dependencies Properties

| Property        | Type     | Required | Nullable       | Defined by                                                                                                                                                            |
| :-------------- | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [npm](#npm)     | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-dependencies-properties-npm-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/npm")     |
| [cargo](#cargo) | `object` | Optional | cannot be null | [fluence.yaml](fluence-properties-dependencies-properties-cargo-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/cargo") |

## npm

A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua

`npm`

*   is optional

*   Type: `object` ([npm dependencies](fluence-properties-dependencies-properties-npm-dependencies.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-dependencies-properties-npm-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/npm")

### npm Type

`object` ([npm dependencies](fluence-properties-dependencies-properties-npm-dependencies.md))

## cargo

A map of cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL

`cargo`

*   is optional

*   Type: `object` ([Cargo dependencies](fluence-properties-dependencies-properties-cargo-dependencies.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-dependencies-properties-cargo-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/cargo")

### cargo Type

`object` ([Cargo dependencies](fluence-properties-dependencies-properties-cargo-dependencies.md))
