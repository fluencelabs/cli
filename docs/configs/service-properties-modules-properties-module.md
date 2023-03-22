## facade Type

`object` ([Module](service-properties-modules-properties-module.md))

# facade Properties

| Property                            | Type      | Required | Nullable       | Defined by                                                                                                                                                                                              |
| :---------------------------------- | :-------- | :------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [get](#get)                         | `string`  | Required | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-get.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/get")                          |
| [maxHeapSize](#maxheapsize)         | `string`  | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-maxheapsize.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/maxHeapSize")          |
| [loggerEnabled](#loggerenabled)     | `boolean` | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-loggerenabled.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/loggerEnabled")      |
| [loggingMask](#loggingmask)         | `number`  | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-loggingmask.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/loggingMask")          |
| [volumes](#volumes)                 | `object`  | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-volumes.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/volumes")                  |
| [preopenedFiles](#preopenedfiles)   | `array`   | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-preopened-files.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/preopenedFiles")   |
| [envs](#envs)                       | `object`  | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-environment-variables.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/envs")       |
| [mountedBinaries](#mountedbinaries) | `object`  | Optional | cannot be null | [service.yaml](service-properties-modules-properties-module-properties-mounted-binaries.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/mountedBinaries") |

## get

Either path to the module directory or URL to the tar.gz archive which contains the content of the module directory

`get`

*   is required

*   Type: `string`

*   cannot be null

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-get.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/get")

### get Type

`string`

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

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-maxheapsize.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/maxHeapSize")

### maxHeapSize Type

`string`

## loggerEnabled

Set true to allow module to use the Marine SDK logger

`loggerEnabled`

*   is optional

*   Type: `boolean`

*   cannot be null

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-loggerenabled.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/loggerEnabled")

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

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-loggingmask.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/loggingMask")

### loggingMask Type

`number`

## volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file. (This property replaces the legacy "mapped\_dirs" property so there is no need to duplicate the same paths in "preopenedFiles" dir)

`volumes`

*   is optional

*   Type: `object` ([Volumes](service-properties-modules-properties-module-properties-volumes.md))

*   cannot be null

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-volumes.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/volumes")

### volumes Type

`object` ([Volumes](service-properties-modules-properties-module-properties-volumes.md))

## preopenedFiles

A list of files and directories that this module could access with WASI

`preopenedFiles`

*   is optional

*   Type: `string[]`

*   cannot be null

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-preopened-files.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/preopenedFiles")

### preopenedFiles Type

`string[]`

## envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS\_ADDR\_ENV\_NAME).

Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

`envs`

*   is optional

*   Type: `object` ([Environment variables](service-properties-modules-properties-module-properties-environment-variables.md))

*   cannot be null

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-environment-variables.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/envs")

### envs Type

`object` ([Environment variables](service-properties-modules-properties-module-properties-environment-variables.md))

## mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

`mountedBinaries`

*   is optional

*   Type: `object` ([Mounted binaries](service-properties-modules-properties-module-properties-mounted-binaries.md))

*   cannot be null

*   defined in: [service.yaml](service-properties-modules-properties-module-properties-mounted-binaries.md "https://fluence.dev/schemas/service.yaml#/properties/modules/properties/facade/properties/mountedBinaries")

### mountedBinaries Type

`object` ([Mounted binaries](service-properties-modules-properties-module-properties-mounted-binaries.md))
