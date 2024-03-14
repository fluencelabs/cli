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

import { ajv, validationErrorToString } from "../../ajvInstance.js";
import { BYTES_PATTERN, MAX_HEAP_SIZE_DESCRIPTION } from "../../const.js";
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
  getConfigInitFunction,
} from "../initConfig.js";

type OverridableModulePropertiesV0 = {
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
  cid?: string;
  rustBindingCrate?: string;
} & OverridableModulePropertiesV0;

const overridableModulePropertiesV0 = {
  maxHeapSize: {
    type: "string",
    nullable: true,
    pattern: BYTES_PATTERN,
    description: MAX_HEAP_SIZE_DESCRIPTION,
  },
  loggerEnabled: {
    type: "boolean",
    nullable: true,
    description: "Set true to allow module to use the Marine SDK logger",
  },
  loggingMask: {
    type: "integer",
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
  cid: {
    description: "CID of the module when it was packed",
    type: "string",
    nullable: true,
  },
  rustBindingCrate: {
    description:
      "Name of the interface crate that should be used with this module",
    type: "string",
    nullable: true,
  },
} as const;

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  description: `!IMPORTANT: All the properties in this config (except for "name") are relevant only for providers who provide effector modules. If you are not a provider - properties in this config will be ignored when you deploy your code. But they will still have effect when running using 'fluence service repl' command. This config defines [Marine Module](https://fluence.dev/docs/build/concepts/#modules). You can use \`${CLI_NAME} module new\` command to generate a template for new module`,
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
    version: { type: "integer", const: 0 },
  },
  additionalProperties: false,
  required: ["version", "name"],
};

type Effects = {
  binaries?: Record<string, string>;
};

const effectsSchema = {
  type: "object",
  nullable: true,
  description:
    "Effects configuration. Only providers can allow and control effector modules by changing the nox configuration. Properties in this config are ignored when you deploy your code",
  properties: {
    binaries: {
      type: "object",
      additionalProperties: {
        type: "string",
      },
      properties: {
        "binary-name": {
          type: "string",
          description: "Path to a binary",
        },
      },
      required: [],
      nullable: true,
      description:
        "A map of binary executable files that module is allowed to call. Example: curl: /usr/bin/curl",
    },
  },
  additionalProperties: false,
  required: [],
} as const satisfies JSONSchemaType<Effects>;

type Repl = {
  loggerEnabled?: boolean;
  loggingMask?: number;
};

const replSchema = {
  type: "object",
  nullable: true,
  description:
    "REPL configuration. Properties in this config are ignored when you deploy your code",
  properties: {
    loggerEnabled: {
      type: "boolean",
      nullable: true,
      description: "Set true to allow module to use the Marine SDK logger",
    },
    loggingMask: {
      type: "number",
      nullable: true,
      description:
        "manages the logging targets, that are described in detail here: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map",
    },
  },
  additionalProperties: false,
  required: [],
} as const satisfies JSONSchemaType<Repl>;

type OverridableModulePropertiesV1 = {
  effects?: Effects;
  repl?: Repl;
};

const overridableModulePropertiesV1 = {
  type: "object",
  properties: {
    effects: effectsSchema,
    repl: replSchema,
  },
  additionalProperties: false,
  required: [],
} as const satisfies JSONSchemaType<OverridableModulePropertiesV1>;

type ConfigV1 = {
  version: 1;
  name: string;
  type?: ModuleType;
  cid?: string;
  rustBindingCrate?: string;
  effects?: Effects;
  repl?: Repl;
};

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${MODULE_CONFIG_FULL_FILE_NAME}`,
  title: MODULE_CONFIG_FULL_FILE_NAME,
  type: "object",
  description: `Defines Marine Module. You can use \`${CLI_NAME} module new\` command to generate a template for new module`,
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
      description: `Default: ${MODULE_TYPE_COMPILED}. Module type "${MODULE_TYPE_RUST}" is for the source code written in rust which can be compiled into a Marine module. Module type "${MODULE_TYPE_COMPILED}" is for the precompiled modules.`,
    },
    version: { type: "integer", const: 1 },
    cid: {
      description: "CID of the module when it was packed",
      type: "string",
      nullable: true,
    },
    rustBindingCrate: {
      description: "Interface crate that can be used with this module",
      type: "string",
      nullable: true,
    },
    ...overridableModulePropertiesV1.properties,
  },
  additionalProperties: false,
  required: ["version", "name"],
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    return {
      version: 1,
      name: config.name,
      ...(config.type === undefined ? {} : { type: config.type }),
      ...(config.mountedBinaries === undefined
        ? {}
        : { effects: { binaries: config.mountedBinaries } }),
      ...(config.loggerEnabled === undefined && config.loggingMask === undefined
        ? {}
        : {
            repl: {
              ...(config.loggerEnabled === undefined
                ? {}
                : { loggerEnabled: config.loggerEnabled }),
              ...(config.loggingMask === undefined
                ? {}
                : { loggingMask: config.loggingMask }),
            },
          }),
    };
  },
];

export type OverridableModuleProperties = OverridableModulePropertiesV1;

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type ModuleConfig = InitializedConfig<LatestConfig>;
export type ModuleConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getInitConfigOptions = (
  configPath: string,
): InitConfigOptions<Config, LatestConfig> => {
  return {
    allSchemas: [configSchemaV0, configSchemaV1],
    latestSchema: configSchemaV1,
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
`;
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

export const initNewModuleConfig = (
  configPath: string,
  name: string,
): Promise<InitializedConfig<LatestConfig>> => {
  return getConfigInitFunction(
    getInitConfigOptions(configPath),
    getDefault(name),
  )();
};

export const moduleSchema: JSONSchemaType<LatestConfig> = configSchemaV1;
export const overridableModuleProperties = overridableModulePropertiesV1;
