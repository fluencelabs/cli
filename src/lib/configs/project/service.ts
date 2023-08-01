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

import { cwd } from "node:process";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import { commandObj } from "../../commandObj.js";
import {
  CLI_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const.js";
import {
  ensureServiceAbsolutePath,
  validateAquaName,
} from "../../helpers/downloadFile.js";
import { getFluenceDir, projectRootDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type GetDefaultConfig,
  type ConfigValidateFunction,
} from "../initConfig.js";

import type { FluenceConfigReadonly } from "./fluence.js";
import {
  type OverridableModuleProperties,
  overridableModuleProperties,
} from "./module.js";

export type ServiceModuleV0 = {
  get: string;
} & OverridableModuleProperties;

const moduleSchemaForService: JSONSchemaType<ServiceModuleV0> = {
  type: "object",
  title: "Module",
  properties: {
    get: {
      type: "string",
      description:
        "Either path to the module directory or URL to the tar.gz archive which contains the content of the module directory",
    },
    ...overridableModuleProperties,
  },
  required: ["get"],
};

export const FACADE_MODULE_NAME = "facade";

type ConfigV0 = {
  version: 0;
  name: string;
  modules: { [FACADE_MODULE_NAME]: ServiceModuleV0 } & Record<
    string,
    ServiceModuleV0
  >;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${SERVICE_CONFIG_FULL_FILE_NAME}`,
  title: SERVICE_CONFIG_FULL_FILE_NAME,
  description: `Defines a [Marine service](https://fluence.dev/docs/build/concepts/#services), most importantly the modules that the service consists of. You can use \`${CLI_NAME} service new\` command to generate a template for new service`,
  properties: {
    name: {
      type: "string",
      description: `Service name. Currently it is used for the service name only when you add service to ${FLUENCE_CONFIG_FULL_FILE_NAME} using "add" command. But this name can be overridden to any other with the --name flag or manually in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
    },
    modules: {
      title: "Modules",
      description: `Service must have a facade module. Each module properties can be overridden by the same properties in the service config`,
      type: "object",
      additionalProperties: moduleSchemaForService,
      properties: {
        [FACADE_MODULE_NAME]: moduleSchemaForService,
        Other_module_name: moduleSchemaForService,
      },
      required: [FACADE_MODULE_NAME],
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "name", "modules"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;

export type ServiceConfig = InitializedConfig<LatestConfig>;
export type ServiceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const validate: ConfigValidateFunction<LatestConfig> = (
  config,
): ReturnType<ConfigValidateFunction<LatestConfig>> => {
  const validity = validateAquaName(config.name);

  if (validity === true) {
    return true;
  }

  return `Invalid service name: ${validity}`;
};

const getInitConfigOptions = (
  configDirPath: string,
): InitConfigOptions<Config, LatestConfig> => {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: SERVICE_CONFIG_FILE_NAME,
    getSchemaDirPath: getFluenceDir,
    getConfigOrConfigDirPath: (): string => {
      return configDirPath;
    },
    validate,
  };
};

export const initServiceConfig = async (
  configOrConfigDirPathOrUrl: string,
  absolutePath: string,
): Promise<InitializedConfig<LatestConfig> | null> => {
  return getConfigInitFunction(
    getInitConfigOptions(
      await ensureServiceAbsolutePath(configOrConfigDirPathOrUrl, absolutePath),
    ),
  )();
};

export const ensureServiceConfig = async (
  nameOrPathOrUrl: string,
  maybeFluenceConfig: FluenceConfigReadonly | null,
): Promise<ServiceConfig> => {
  const maybeServicePathFromFluenceConfig =
    maybeFluenceConfig?.services?.[nameOrPathOrUrl]?.get;

  const serviceOrServiceDirPathOrUrl =
    maybeServicePathFromFluenceConfig ?? nameOrPathOrUrl;

  const serviceConfig = await initServiceConfig(
    serviceOrServiceDirPathOrUrl,
    maybeServicePathFromFluenceConfig === "string" ? projectRootDir : cwd(),
  );

  if (serviceConfig === null) {
    return commandObj.error(
      `No service config at ${color.yellow(serviceOrServiceDirPathOrUrl)}`,
    );
  }

  return serviceConfig;
};

export const initReadonlyServiceConfig = async (
  configOrConfigDirPathOrUrl: string,
  absolutePath: string,
): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(
      await ensureServiceAbsolutePath(configOrConfigDirPathOrUrl, absolutePath),
    ),
  )();
};

const getDefault: (
  relativePathToFacade: string,
  name: string,
) => GetDefaultConfig = (
  relativePathToFacade: string,
  name: string,
): GetDefaultConfig => {
  return () => {
    return `# Defines a [Marine service](https://fluence.dev/docs/build/concepts/#services),
# most importantly the modules that the service consists of.
# You can use \`fluence service new\` command to generate a template for new service

# Service name.
# Currently it is used for the service name only when you add service to fluence.yaml using "add" command.
# But this name can be overridden to any other with the --name flag or manually in fluence.yaml
name: ${name}

# A map of modules that the service consists of.
# Service must have a facade module. Each module properties can be overridden
modules:
  facade: # module name
    # Either path to the module directory or
    # URL to the tar.gz archive which contains the content of the module directory
    get: "${relativePathToFacade}"

    # You can override module configuration here:

#     # environment variables accessible by a particular module
#     # with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)
#     # Module environment variables could be examined with repl
#     envs:
#       ENV_VARIABLE: "env variable string value"
#
#     # Set true to allow module to use the Marine SDK logger
#     loggerEnabled: true
#
#     # manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map
#     loggingMask: 1
#
#     # Max size of the heap that a module can allocate in format:
#     # [number][whitespace?][specificator?]
#     # where ? is an optional field and specificator is one from the following (case-insensitive):
#     # K, Kb - kilobyte
#     # Ki, KiB - kibibyte
#     # M, Mb - megabyte
#     # Mi, MiB - mebibyte
#     # G, Gb - gigabyte
#     # Gi, GiB - gibibyte
#     # Current limit is 4 GiB
#     maxHeapSize: 1KiB
#
#     # A map of binary executable files that module is allowed to call
#     mountedBinaries:
#       curl: "/usr/bin/curl"
#
#     # A map of accessible files and their aliases.
#     # Aliases should be used in Marine module development because it's hard to know the full path to a file
#     volumes:
#       alias: "some/alias/path"

# config version
version: 0
`;
  };
};

export const initNewReadonlyServiceConfig = (
  configPath: string,
  relativePathToFacade: string,
  name: string,
): Promise<InitializedReadonlyConfig<LatestConfig>> => {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(configPath),
    getDefault(relativePathToFacade, name),
  )();
};

export const serviceSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
