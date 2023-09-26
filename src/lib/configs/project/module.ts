/**
 * Copyright 2023 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { JSONSchemaType } from "ajv";

import {
  type ModuleType,
  MODULE_CONFIG_FULL_FILE_NAME,
  MODULE_TYPES,
  MODULE_TYPE_COMPILED,
  MODULE_TYPE_RUST,
  TOP_LEVEL_SCHEMA_ID,
  MODULE_CONFIG_FILE_NAME,
  CLI_NAME,
} from "../../const.js";
import { ensureModuleAbsolutePath } from "../../helpers/downloadFile.js";
import { getFluenceDir } from "../../paths.js";
import {
  getReadonlyConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type GetDefaultConfig,
} from "../initConfig.js";

export type OverridableModuleProperties = {
  maxHeapSize?: string;
  loggerEnabled?: boolean;
  loggingMask?: number;
  volumes?: Record<string, string>;
  envs?: Record<string, string>;
  mountedBinaries?: Record<string, string>;
};

export type ConfigV0 = {
  version: 0;
  name: string;
  type?: ModuleType;
} & OverridableModuleProperties;

const overridableModulePropertiesV0 = {
  maxHeapSize: {
    type: "string",
    nullable: true,
    description:
      "Max size of the heap that a module can allocate in format: [number][whitespace?][specificator?] where ? is an optional field and specificator is one from the following (case-insensitive):\nK, Kb - kilobyte\nKi, KiB - kibibyte\nM, Mb - megabyte\nMi, MiB - mebibyte\nG, Gb - gigabyte\nGi, GiB - gibibyte\nCurrent limit is 4 GiB",
  },
  loggerEnabled: {
    type: "boolean",
    nullable: true,
    description: "Set true to allow module to use the Marine SDK logger",
  },
  loggingMask: {
    type: "number",
    nullable: true,
    description:
      "manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map",
  },
  volumes: {
    type: "object",
    nullable: true,
    required: [],
    title: "Volumes",
    additionalProperties: { type: "string" },
    properties: {
      Alias: { type: "string", description: "path" },
    },
    description:
      "A map of accessible files and their aliases. Aliases should be used in Marine module development because it's hard to know the full path to a file",
  },
  envs: {
    type: "object",
    title: "Environment variables",
    nullable: true,
    required: [],
    additionalProperties: {
      type: "string",
    },
    properties: {
      Environment_variable_name: {
        type: "string",
        description: "Environment variable value",
      },
    },
    description:
      "environment variables accessible by a particular module with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME). Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl",
  },
  mountedBinaries: {
    title: "Mounted binaries",
    type: "object",
    additionalProperties: {
      type: "string",
    },
    properties: {
      Mounted_binary_name: {
        type: "string",
        description: "Path to a mounted binary",
      },
    },
    nullable: true,
    required: [],
    description:
      "A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl",
  },
} as const;

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${MODULE_CONFIG_FULL_FILE_NAME}`,
  title: MODULE_CONFIG_FULL_FILE_NAME,
  description: `Defines [Marine Module](https://fluence.dev/docs/build/concepts/#modules). You can use \`${CLI_NAME} module new\` command to generate a template for new module`,
  properties: {
    name: {
      type: "string",
      description: `"name" property from the Cargo.toml (for module type "${MODULE_TYPE_RUST}") or name of the precompiled .wasm file (for module type "${MODULE_TYPE_COMPILED}")`,
    },
    type: {
      type: "string",
      enum: MODULE_TYPES,
      nullable: true,
      default: MODULE_TYPE_COMPILED,
      description: `Module type "${MODULE_TYPE_COMPILED}" is for the precompiled modules. Module type "${MODULE_TYPE_RUST}" is for the source code written in rust which can be compiled into a Marine module`,
    },
    ...overridableModulePropertiesV0,
    version: { type: "number", const: 0 },
  },
  required: ["version", "name"],
};

const migrations: Migrations<Config> = [];
type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ModuleConfig = InitializedConfig<LatestConfig>;
export type ModuleConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getInitConfigOptions = (
  configPath: string,
): InitConfigOptions<Config, LatestConfig> => {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: MODULE_CONFIG_FILE_NAME,
    getSchemaDirPath: getFluenceDir,
    getConfigOrConfigDirPath: (): string => {
      return configPath;
    },
  };
};

export const initReadonlyModuleConfig = async (
  configOrConfigDirPathOrUrl: string,
  absolutePath?: string | undefined,
): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(
      await ensureModuleAbsolutePath(configOrConfigDirPathOrUrl, absolutePath),
    ),
  )();
};

const getDefault: (name: string) => GetDefaultConfig = (
  name: string,
): GetDefaultConfig => {
  return () => {
    return `# Module type "rust" is for the source code written in rust which can be compiled into a Marine module

# config versions
version: 0

# Module type "compiled" is for the precompiled modules.
type: ${MODULE_TYPE_RUST} # default: "compiled"

# "name" property from the Cargo.toml (for module type "rust")
# or name of the precompiled .wasm file (for module type "compiled")
name: ${name}

# # environment variables accessible by a particular module
# # with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)
# # Module environment variables could be examined with repl
# envs:
#   ENV_VARIABLE: "env variable string value"
#
# # Set true to allow module to use the Marine SDK logger
# loggerEnabled: true
#
# # manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map
# loggingMask: 1
#
# # Max size of the heap that a module can allocate in format:
# # [number][whitespace?][specificator?]
# # where ? is an optional field and specificator is one from the following (case-insensitive):
# # K, Kb - kilobyte
# # Ki, KiB - kibibyte
# # M, Mb - megabyte
# # Mi, MiB - mebibyte
# # G, Gb - gigabyte
# # Gi, GiB - gibibyte
# # Current limit is 4 GiB
# maxHeapSize: 1KiB
#
# # A map of binary executable files that module is allowed to call
# mountedBinaries:
#   curl: "/usr/bin/curl"
#
# # A map of accessible files and their aliases.
# # Aliases should be used in Marine module development because it's hard to know the full path to a file
# volumes:
#   alias: "some/alias/path"`;
  };
};

export const initNewReadonlyModuleConfig = (
  configPath: string,
  name: string,
): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(configPath),
    getDefault(name),
  )();
};

export const moduleSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
export const overridableModuleProperties = overridableModulePropertiesV0;
