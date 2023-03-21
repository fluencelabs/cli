## module.yaml Type

`object` ([module.yaml](module.md))

# module.yaml Properties

| Property                            | Type      | Required | Nullable       | Defined by                                                                                                                 |
| :---------------------------------- | :-------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------- |
| [name](#name)                       | `string`  | Required | cannot be null | [module.yaml](module-properties-name.md "https://fluence.dev/schemas/module.yaml#/properties/name")                        |
| [type](#type)                       | `string`  | Optional | cannot be null | [module.yaml](module-properties-type.md "https://fluence.dev/schemas/module.yaml#/properties/type")                        |
| [maxHeapSize](#maxheapsize)         | `string`  | Optional | cannot be null | [module.yaml](module-properties-maxheapsize.md "https://fluence.dev/schemas/module.yaml#/properties/maxHeapSize")          |
| [loggerEnabled](#loggerenabled)     | `boolean` | Optional | cannot be null | [module.yaml](module-properties-loggerenabled.md "https://fluence.dev/schemas/module.yaml#/properties/loggerEnabled")      |
| [loggingMask](#loggingmask)         | `number`  | Optional | cannot be null | [module.yaml](module-properties-loggingmask.md "https://fluence.dev/schemas/module.yaml#/properties/loggingMask")          |
| [volumes](#volumes)                 | `object`  | Optional | cannot be null | [module.yaml](module-properties-volumes.md "https://fluence.dev/schemas/module.yaml#/properties/volumes")                  |
| [preopenedFiles](#preopenedfiles)   | `array`   | Optional | cannot be null | [module.yaml](module-properties-preopened-files.md "https://fluence.dev/schemas/module.yaml#/properties/preopenedFiles")   |
| [envs](#envs)                       | `object`  | Optional | cannot be null | [module.yaml](module-properties-environment-variables.md "https://fluence.dev/schemas/module.yaml#/properties/envs")       |
| [mountedBinaries](#mountedbinaries) | `object`  | Optional | cannot be null | [module.yaml](module-properties-mounted-binaries.md "https://fluence.dev/schemas/module.yaml#/properties/mountedBinaries") |
| [version](#version)                 | `number`  | Required | cannot be null | [module.yaml](module-properties-version.md "https://fluence.dev/schemas/module.yaml#/properties/version")                  |

## name

"name" property from the Cargo.toml (for module type "rust") or name of the precompiled .wasm file (for module type "compiled")

`name`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [module.yaml](module-properties-name.md "https://fluence.dev/schemas/module.yaml#/properties/name")

### name Type

`string`

## type

Module type "compiled" is for the precompiled modules. Module type "rust" is for the source code written in rust which can be compiled into a Marine module

`type`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [module.yaml](module-properties-type.md "https://fluence.dev/schemas/module.yaml#/properties/type")

### type Type

`string`

### type Constraints

**enum**: the value of this property must be equal to one of the following values:

| Value        | Explanation |
| :----------- | :---------- |
| `"rust"`     |             |
| `"compiled"` |             |

### type Default Value

The default value is:

```json
"compiled"
```

## maxHeapSize

Max size of the heap that a module can allocate in format: \[number]\[whitespace?]\[specificator?] where ? is an optional field and specificator is one from the following (case-insensitive):

K, Kb - kilobyte

Ki, KiB - kibibyte

M, Mb - megabyte

Mi, MiB - mebibyte

G, Gb - gigabyte

Gi, GiB - gibibyte

Current limit is 4 GiB

`maxHeapSize`

*   is optional

*   Type: `string`

*   cannot be null

*   defined in: [module.yaml](module-properties-maxheapsize.md "https://fluence.dev/schemas/module.yaml#/properties/maxHeapSize")

### maxHeapSize Type

`string`

## loggerEnabled

Set true to allow module to use the Marine SDK logger

`loggerEnabled`

*   is optional

*   Type: `boolean`

*   cannot be null

*   defined in: [module.yaml](module-properties-loggerenabled.md "https://fluence.dev/schemas/module.yaml#/properties/loggerEnabled")

### loggerEnabled Type

`boolean`

## loggingMask

Used for logging management. Example:

```rust
const TARGET_MAP: [(&str, i64); 4] = [
("instruction", 1 << 1),
("data_cache", 1 << 2),
("next_peer_pks", 1 << 3),
("subtree_complete", 1 << 4),
];
pub fn main() {
use std::collections::HashMap;
use std::iter::FromIterator;

let target_map = HashMap::from_iter(TARGET_MAP.iter().cloned());

marine_rs_sdk::WasmLoggerBuilder::new()
    .with_target_map(target_map)
    .build()
    .unwrap();
}
#[marine]
pub fn foo() {
log::info!(target: "instruction", "this will print if (loggingMask & 1) != 0");
log::info!(target: "data_cache", "this will print if (loggingMask & 2) != 0");
}
```

`loggingMask`

*   is optional

*   Type: `number`

*   cannot be null

*   defined in: [module.yaml](module-properties-loggingmask.md "https://fluence.dev/schemas/module.yaml#/properties/loggingMask")

### loggingMask Type

`number`

## volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file. (This property replaces the legacy "mapped\_dirs" property so there is no need to duplicate the same paths in "preopenedFiles" dir)

`volumes`

*   is optional

*   Type: `object` ([Volumes](module-properties-volumes.md))

*   cannot be null

*   defined in: [module.yaml](module-properties-volumes.md "https://fluence.dev/schemas/module.yaml#/properties/volumes")

### volumes Type

`object` ([Volumes](module-properties-volumes.md))

## preopenedFiles

A list of files and directories that this module could access with WASI

`preopenedFiles`

*   is optional

*   Type: `string[]`

*   cannot be null

*   defined in: [module.yaml](module-properties-preopened-files.md "https://fluence.dev/schemas/module.yaml#/properties/preopenedFiles")

### preopenedFiles Type

`string[]`

## envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS\_ADDR\_ENV\_NAME).

Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

`envs`

*   is optional

*   Type: `object` ([Environment variables](module-properties-environment-variables.md))

*   cannot be null

*   defined in: [module.yaml](module-properties-environment-variables.md "https://fluence.dev/schemas/module.yaml#/properties/envs")

### envs Type

`object` ([Environment variables](module-properties-environment-variables.md))

## mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

`mountedBinaries`

*   is optional

*   Type: `object` ([Mounted binaries](module-properties-mounted-binaries.md))

*   cannot be null

*   defined in: [module.yaml](module-properties-mounted-binaries.md "https://fluence.dev/schemas/module.yaml#/properties/mountedBinaries")

### mountedBinaries Type

`object` ([Mounted binaries](module-properties-mounted-binaries.md))

## version



`version`

*   is required

*   Type: `number`

*   cannot be null

*   defined in: [module.yaml](module-properties-version.md "https://fluence.dev/schemas/module.yaml#/properties/version")

### version Type

`number`

### version Constraints

**constant**: the value of this property must be equal to:

```json
0
```
