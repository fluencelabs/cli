# module.yaml

Defines Marine Module. You can use `fluence module new` command to generate a template for new module

## Properties

| Property           | Type               | Required | Description                                                                                                                                                                                                              |
|--------------------|--------------------|----------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`             | string             | **Yes**  | "name" property from the Cargo.toml (for module type "rust") or name of the precompiled .wasm file (for module type "compiled")                                                                                          |
| `version`          | integer            | **Yes**  |                                                                                                                                                                                                                          |
| `cid`              | string             | No       | CID of the module when it was packed                                                                                                                                                                                     |
| `effects`          | [object](#effects) | No       | Effects configuration. Only providers can allow and control effector modules by changing the nox configuration. Properties in this config are ignored when you deploy your code                                          |
| `repl`             | [object](#repl)    | No       | REPL configuration. Properties in this config are ignored when you deploy your code                                                                                                                                      |
| `rustBindingCrate` | string             | No       | Interface crate that can be used with this module                                                                                                                                                                        |
| `type`             | string             | No       | Default: compiled. Module type "rust" is for the source code written in rust which can be compiled into a Marine module. Module type "compiled" is for the precompiled modules. Possible values are: `rust`, `compiled`. |

## effects

Effects configuration. Only providers can allow and control effector modules by changing the nox configuration. Properties in this config are ignored when you deploy your code

### Properties

| Property   | Type                | Required | Description                                                                                   |
|------------|---------------------|----------|-----------------------------------------------------------------------------------------------|
| `binaries` | [object](#binaries) | No       | A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl |

### binaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

#### Properties

| Property      | Type   | Required | Description      |
|---------------|--------|----------|------------------|
| `binary-name` | string | No       | Path to a binary |

## repl

REPL configuration. Properties in this config are ignored when you deploy your code

### Properties

| Property        | Type    | Required | Description                                                                                                                                              |
|-----------------|---------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `loggerEnabled` | boolean | No       | Set true to allow module to use the Marine SDK logger                                                                                                    |
| `loggingMask`   | number  | No       | manages the logging targets, that are described in detail here: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map |

