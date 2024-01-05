# service.yaml

Defines a [Marine service](https://fluence.dev/docs/build/concepts/#services), most importantly the modules that the service consists of. You can use `fluence service new` command to generate a template for new service

## Properties

| Property           | Type               | Required | Description                                                                                                                                                                                                                  |
|--------------------|--------------------|----------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `modules`          | [object](#modules) | **Yes**  | Service must have a facade module. Each module properties can be overridden by the same properties in the service config                                                                                                     |
| `name`             | string             | **Yes**  | Service name. Currently it is used for the service name only when you add service to fluence.yaml using "add" command. But this name can be overridden to any other with the --name flag or manually in fluence.yaml         |
| `version`          | number             | **Yes**  |                                                                                                                                                                                                                              |
| `totalMemoryLimit` | string             | No       | Default: Infinity. Currently used only in repl. Total memory limit for a service in format: [number][whitespace?][specificator?] where ? is an optional field and specificator is one from the following (case-insensitive): |
|                    |                    |          | K, Kb - kilobyte                                                                                                                                                                                                             |
|                    |                    |          | Ki, KiB - kibibyte                                                                                                                                                                                                           |
|                    |                    |          | M, Mb - megabyte                                                                                                                                                                                                             |
|                    |                    |          | Mi, MiB - mebibyte                                                                                                                                                                                                           |
|                    |                    |          | G, Gb - gigabyte                                                                                                                                                                                                             |
|                    |                    |          | Gi, GiB - gibibyte                                                                                                                                                                                                           |

## modules

Service must have a facade module. Each module properties can be overridden by the same properties in the service config

### Properties

| Property            | Type                         | Required | Description |
|---------------------|------------------------------|----------|-------------|
| `facade`            | [object](#facade)            | **Yes**  |             |
| `Other_module_name` | [object](#other_module_name) | No       |             |

### Other_module_name

#### Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                                                                                    |
|-------------------|----------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `get`             | string                     | **Yes**  | Either path to the module directory or URL to the tar.gz archive which contains the content of the module directory                                                                                                                                            |
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
| `volumes`         | [object](#volumes)         | No       | A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file                                                                                                             |

#### envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

##### Properties

| Property                    | Type   | Required | Description                |
|-----------------------------|--------|----------|----------------------------|
| `Environment_variable_name` | string | No       | Environment variable value |

#### mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

##### Properties

| Property              | Type   | Required | Description              |
|-----------------------|--------|----------|--------------------------|
| `Mounted_binary_name` | string | No       | Path to a mounted binary |

#### volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `Alias`  | string | No       | path        |

### facade

#### Properties

| Property          | Type                       | Required | Description                                                                                                                                                                                                                                                    |
|-------------------|----------------------------|----------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `get`             | string                     | **Yes**  | Either path to the module directory or URL to the tar.gz archive which contains the content of the module directory                                                                                                                                            |
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
| `volumes`         | [object](#volumes)         | No       | A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file                                                                                                             |

#### envs

environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl

##### Properties

| Property                    | Type   | Required | Description                |
|-----------------------------|--------|----------|----------------------------|
| `Environment_variable_name` | string | No       | Environment variable value |

#### mountedBinaries

A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl

##### Properties

| Property              | Type   | Required | Description              |
|-----------------------|--------|----------|--------------------------|
| `Mounted_binary_name` | string | No       | Path to a mounted binary |

#### volumes

A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file

##### Properties

| Property | Type   | Required | Description |
|----------|--------|----------|-------------|
| `Alias`  | string | No       | path        |

