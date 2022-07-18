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

import { CommandObj, MODULE_CONFIG_FILE_NAME } from "../../const";
import { ensureProjectFluenceDirPath } from "../../paths";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig";

export type ConfigV0 = {
  version: 0;
  name: string;
  maxHeapSize?: string;
  loggerEnabled?: boolean;
  loggingMask?: number;
  volumes?: Record<string, string>;
  preopenedFiles?: Array<string>;
  envs?: Record<string, string>;
  mountedBinaries?: Record<string, string>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    name: { type: "string" },
    maxHeapSize: { type: "string", nullable: true },
    loggerEnabled: { type: "boolean", nullable: true },
    loggingMask: { type: "number", nullable: true },
    volumes: { type: "object", nullable: true, required: [] },
    preopenedFiles: {
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    envs: { type: "object", nullable: true, required: [] },
    mountedBinaries: { type: "object", nullable: true, required: [] },
  },
  required: ["version", "name"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ModuleConfig = InitializedConfig<LatestConfig>;
export type ModuleConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getInitConfigOptions = (
  configPath: string
): InitConfigOptions<Config, LatestConfig> => ({
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: MODULE_CONFIG_FILE_NAME,
  getSchemaDirPath: ensureProjectFluenceDirPath,
  getConfigDirPath: (): string => configPath,
});

export const initModuleConfig = (
  configPath: string,
  commandObj: CommandObj
): Promise<InitializedConfig<LatestConfig> | null> =>
  getConfigInitFunction(getInitConfigOptions(configPath))(commandObj);
export const initReadonlyModuleConfig = (
  configPath: string,
  commandObj: CommandObj
): Promise<InitializedReadonlyConfig<LatestConfig> | null> =>
  getReadonlyConfigInitFunction(getInitConfigOptions(configPath))(commandObj);
