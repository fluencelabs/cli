# module.yaml

Defines [Marine Module](https://fluence.dev/docs/build/concepts/#modules). You can use `flox module new` command to generate a template for new module

## Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                                                                                    |
|-------------------|----------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `name`            | string                     | **Yes**  | "name" property from the Cargo.toml (for module type "rust") or name of the precompiled .wasm file (for module type "compiled")                                                                                                                                |
| `version`         | number                     | **Yes**  |                                                                                                                                                                                                                                                                |
| `envs`            | [object](#envs)            | No       | environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl |
| `loggerEnabled`   | boolean                    | No       | Set true to allow module to use the Marine SDK logger                                                                                                                                                                                                          |
| `loggingMask`     | number                     | No       | manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map                                                                                                                     |
| `maxHeapSize`     | string                     | No       | Max size of the heap that a module can allocate in format: [number][whitespace?][specificator?] where ? is an optional field and specificator is one from the following (case-insensitive):                                                                    |
|                   |                            |          | K, Kb - kilobyte                                                                                                                                                                                                                                               |
|                   |                            |          | Ki, KiB - kibibyte                                                                                                                                                                                                                                             |
|                   |                            |          | M, Mb - megabyte                                                                                                                                                                                                                                               |
|                   |                            |          | Mi, MiB - mebibyte                                                                                                                                                                                                                                             |
|                   |                            |          | G, Gb - gigabyte                                                                                                                                                                                                                                               |
|                   |                            |          | Gi, GiB - gibibyte                                                                                                                                                                                                                                             |
|                   |                            |          | Current limit is 4 GiB                                                                                                                                                                                                                                         |
| `mountedBinaries` | [object](#mountedbinaries) | No       | A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl                                                                                                                                                                  |
| `type`            | string                     | No       | Module type "compiled" is for the precompiled modules. Module type "rust" is for the source code written in rust which can be compiled into a Marine module Possible values are: `rust`, `compiled`.                                                           |
| `volumes`         | [object](#volumes)         | No       | A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file                                                                                                             |

## envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

### Properties

| Property                    | Type   | Required | Description                |
|-----------------------------|--------|----------|----------------------------|
| `Environment_variable_name` | string | No       | Environment variable value |

## mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

### Properties

| Property              | Type   | Required | Description              |
|-----------------------|--------|----------|--------------------------|
| `Mounted_binary_name` | string | No       | Path to a mounted binary |

## volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file

### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `Alias`  | string | No       | path        |

