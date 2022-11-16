## dependencies Type

`object` ([Dependencies](fluence-properties-dependencies.md))

# dependencies Properties

| Property        | Type     | Required | Nullable       | Defined by                                                                                                                                                            |
| :-------------- | :------- | :------- | :------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [npm](#npm)     | `object` | Required | cannot be null | [fluence.yaml](fluence-properties-dependencies-properties-npm-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/npm")     |
| [cargo](#cargo) | `object` | Required | cannot be null | [fluence.yaml](fluence-properties-dependencies-properties-cargo-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/cargo") |

## npm

A map of the exact npm dependency versions. Acts like a lock file. CLI ensures dependencies are installed each time you run aqua

`npm`

*   is required

*   Type: `object` ([npm dependencies](fluence-properties-dependencies-properties-npm-dependencies.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-dependencies-properties-npm-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/npm")

### npm Type

`object` ([npm dependencies](fluence-properties-dependencies-properties-npm-dependencies.md))

## cargo

A map of the exact cargo dependency versions. Acts like a lock file. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL

`cargo`

*   is required

*   Type: `object` ([Cargo dependencies](fluence-properties-dependencies-properties-cargo-dependencies.md))

*   cannot be null

*   defined in: [fluence.yaml](fluence-properties-dependencies-properties-cargo-dependencies.md "https://fluence.dev/schemas/fluence.yaml#/properties/dependencies/properties/cargo")

### cargo Type

`object` ([Cargo dependencies](fluence-properties-dependencies-properties-cargo-dependencies.md))
