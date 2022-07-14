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

import { CommandObj, SERVICE_FILE_NAME } from "../../const";
import { ensureProjectFluenceDirPath } from "../../paths";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig";

import type { ConfigV0 as ModuleConfig } from "./module";

export type ModuleV0 = {
  get: string;
} & Partial<Omit<ModuleConfig, "version">>;

export type Module = ModuleV0;

const moduleSchema: JSONSchemaType<ModuleV0> = {
  type: "object",
  properties: {
    get: { type: "string" },
    name: { type: "string", nullable: true },
    maxHeapSize: { type: "string", nullable: true },
    loggerEnabled: { type: "boolean", nullable: true },
    loggingMask: { type: "number", nullable: true },
    mappedDirs: { type: "object", nullable: true, required: [] },
    preopenedFiles: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
    envs: { type: "object", nullable: true, required: [] },
    mountedBinaries: { type: "object", nullable: true, required: [] },
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
  properties: {
    version: { type: "number", enum: [0] },
    name: { type: "string" },
    modules: {
      type: "object",
      additionalProperties: moduleSchema,
      properties: {
        [FACADE_MODULE_NAME]: moduleSchema,
      },
      required: [FACADE_MODULE_NAME],
    },
  },
  required: ["version", "modules", "name"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type AppConfig = InitializedConfig<LatestConfig>;
export type AppConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getInitConfigOptions = (
  configPath: string
): InitConfigOptions<Config, LatestConfig> => ({
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: SERVICE_FILE_NAME,
  getSchemaDirPath: ensureProjectFluenceDirPath,
  getPath: (): string => configPath,
});

export const initServiceConfig = (
  configPath: string,
  commandObj: CommandObj
): Promise<InitializedConfig<LatestConfig> | null> =>
  getConfigInitFunction(getInitConfigOptions(configPath))(commandObj);
export const initReadonlyServiceConfig = (
  configPath: string,
  commandObj: CommandObj
): Promise<InitializedReadonlyConfig<LatestConfig> | null> =>
  getReadonlyConfigInitFunction(getInitConfigOptions(configPath))(commandObj);
