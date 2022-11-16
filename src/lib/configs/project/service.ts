/**
 * Copyright 2022 Fluence Labs Limited
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
  CommandObj,
  FLUENCE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const";
import { validateAquaName } from "../../helpers/downloadFile";
import { ensureFluenceDir } from "../../paths";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  GetDefaultConfig,
  ConfigValidateFunction,
} from "../initConfig";

import { ConfigV0 as ModuleConfig, moduleProperties } from "./module";

export type ModuleV0 = {
  get: string;
} & Partial<Omit<ModuleConfig, "version">>;

export type Module = ModuleV0;

const moduleSchemaForService: JSONSchemaType<ModuleV0> = {
  type: "object",
  title: "Module",
  properties: {
    ...moduleProperties,
    get: {
      type: "string",
      description:
        "Either path to the module directory or URL to the tar.gz archive which contains the content of the module directory",
    },
    name: { ...moduleProperties.name, nullable: true },
  },
  required: ["get"],
};

export const FACADE_MODULE_NAME = "facade";

export type ConfigV0 = {
  version: 0;
  name: string;
  modules: { [FACADE_MODULE_NAME]: ModuleV0 } & Record<string, ModuleV0>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${SERVICE_CONFIG_FILE_NAME}`,
  title: SERVICE_CONFIG_FILE_NAME,
  description: `Service is a directory which contains this config`,
  properties: {
    version: { type: "number", const: 0 },
    name: {
      type: "string",
      description: `Service name. Currently it is used for the service name only when you add service to ${FLUENCE_CONFIG_FILE_NAME} using "add" command. But this name can be overridden to any other with the --name flag or manually in ${FLUENCE_CONFIG_FILE_NAME}`,
    },
    modules: {
      title: "Modules",
      description: `Service must have a facade module. Each module properties can be overridden by the same properties in the service config`,
      type: "object",
      additionalProperties: moduleSchemaForService,
      properties: {
        [FACADE_MODULE_NAME]: moduleSchemaForService,
      },
      required: [FACADE_MODULE_NAME],
    },
  },
  required: ["version", "name", "modules"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;

export type ServiceConfig = InitializedConfig<LatestConfig>;
export type ServiceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const validate: ConfigValidateFunction<LatestConfig> = (
  config
): ReturnType<ConfigValidateFunction<LatestConfig>> => {
  const validity = validateAquaName(config.name);

  if (validity === true) {
    return true;
  }

  return `Invalid service name: ${validity}`;
};

const getInitConfigOptions = (
  configDirPath: string
): InitConfigOptions<Config, LatestConfig> => ({
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: SERVICE_CONFIG_FILE_NAME,
  getSchemaDirPath: ensureFluenceDir,
  getConfigDirPath: (): string => configDirPath,
  validate,
});

export const initServiceConfig = (
  configDirPath: string,
  commandObj: CommandObj
): Promise<InitializedConfig<LatestConfig> | null> =>
  getConfigInitFunction(getInitConfigOptions(configDirPath))(commandObj);

export const initReadonlyServiceConfig = (
  configDirPath: string,
  commandObj: CommandObj
): Promise<InitializedReadonlyConfig<LatestConfig> | null> =>
  getReadonlyConfigInitFunction(getInitConfigOptions(configDirPath))(
    commandObj
  );

const getDefault: (
  relativePathToFacade: string,
  name: string
) => GetDefaultConfig<LatestConfig> =
  (
    relativePathToFacade: string,
    name: string
  ): GetDefaultConfig<LatestConfig> =>
  (): LatestConfig => ({
    version: 0,
    name,
    modules: {
      [FACADE_MODULE_NAME]: {
        get: relativePathToFacade,
      },
    },
  });

export const initNewReadonlyServiceConfig = (
  configPath: string,
  commandObj: CommandObj,
  relativePathToFacade: string,
  name: string
): Promise<InitializedReadonlyConfig<LatestConfig> | null> =>
  getReadonlyConfigInitFunction(
    getInitConfigOptions(configPath),
    getDefault(relativePathToFacade, name)
  )(commandObj);

export const serviceSchema = configSchemaV0;
