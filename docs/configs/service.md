# service.yaml

Defines a [Marine service](https://fluence.dev/docs/build/concepts/#services), most importantly the modules that the service consists of. You can use `fluence service new` command to generate a template for new service

## Properties

| Property  | Type               | Required | Description                                                                                                                                                                                                          |
|-----------|--------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `modules` | [object](#modules) | **Yes**  | Service must have a facade module. Each module properties can be overridden by the same properties in the service config                                                                                             |
| `name`    | string             | **Yes**  | Service name. Currently it is used for the service name only when you add service to fluence.yaml using "add" command. But this name can be overridden to any other with the --name flag or manually in fluence.yaml |
| `version` | number             | **Yes**  |                                                                                                                                                                                                                      |

## modules

Service must have a facade module. Each module properties can be overridden by the same properties in the service config

### Properties

| Property | Type              | Required | Description |
|----------|-------------------|----------|-------------|
| `facade` | [object](#facade) | **Yes**  |             |

### facade

#### Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                 |
|-------------------|----------------------------|----------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `get`             | string                     | **Yes**  | Either path to the module directory or URL to the tar.gz archive which contains the content of the module directory                                                                         |
| `envs`            | [object](#envs)            | No       | environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME).                                                            |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl                                                               |
| `loggerEnabled`   | boolean                    | No       | Set true to allow module to use the Marine SDK logger                                                                                                                                       |
| `loggingMask`     | number                     | No       | Used for logging management. Example:                                                                                                                                                       |
|                   |                            |          | ```rust                                                                                                                                                                                     |
|                   |                            |          | const TARGET_MAP: [(&str, i64); 4] = [                                                                                                                                                      |
|                   |                            |          | ("instruction", 1 << 1),                                                                                                                                                                    |
|                   |                            |          | ("data_cache", 1 << 2),                                                                                                                                                                     |
|                   |                            |          | ("next_peer_pks", 1 << 3),                                                                                                                                                                  |
|                   |                            |          | ("subtree_complete", 1 << 4),                                                                                                                                                               |
|                   |                            |          | ];                                                                                                                                                                                          |
|                   |                            |          | pub fn main() {                                                                                                                                                                             |
|                   |                            |          | use std::collections::HashMap;                                                                                                                                                              |
|                   |                            |          | use std::iter::FromIterator;                                                                                                                                                                |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | let target_map = HashMap::from_iter(TARGET_MAP.iter().cloned());                                                                                                                            |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | marine_rs_sdk::WasmLoggerBuilder::new()                                                                                                                                                     |
|                   |                            |          |     .with_target_map(target_map)                                                                                                                                                            |
|                   |                            |          |     .build()                                                                                                                                                                                |
|                   |                            |          |     .unwrap();                                                                                                                                                                              |
|                   |                            |          | }                                                                                                                                                                                           |
|                   |                            |          | #[marine]                                                                                                                                                                                   |
|                   |                            |          | pub fn foo() {                                                                                                                                                                              |
|                   |                            |          | log::info!(target: "instruction", "this will print if (loggingMask & 1) != 0");                                                                                                             |
|                   |                            |          | log::info!(target: "data_cache", "this will print if (loggingMask & 2) != 0");                                                                                                              |
|                   |                            |          | }                                                                                                                                                                                           |
|                   |                            |          | ```                                                                                                                                                                                         |
| `maxHeapSize`     | string                     | No       | Max size of the heap that a module can allocate in format: [number][whitespace?][specificator?] where ? is an optional field and specificator is one from the following (case-insensitive): |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | K, Kb - kilobyte                                                                                                                                                                            |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | Ki, KiB - kibibyte                                                                                                                                                                          |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | M, Mb - megabyte                                                                                                                                                                            |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | Mi, MiB - mebibyte                                                                                                                                                                          |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | G, Gb - gigabyte                                                                                                                                                                            |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | Gi, GiB - gibibyte                                                                                                                                                                          |
|                   |                            |          |                                                                                                                                                                                             |
|                   |                            |          | Current limit is 4 GiB                                                                                                                                                                      |
| `mountedBinaries` | [object](#mountedbinaries) | No       | A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl                                                                                               |
| `volumes`         | [object](#volumes)         | No       | A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file                                          |

#### envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME).

Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

| Property | Type | Required | Description |
|----------|------|----------|-------------|

#### mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

| Property | Type | Required | Description |
|----------|------|----------|-------------|

#### volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file

| Property | Type | Required | Description |
|----------|------|----------|-------------|

