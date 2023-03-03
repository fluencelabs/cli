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
  FLUENCE_LOCK_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const.js";
import { ensureFluenceDir, projectRootDir } from "../../paths.js";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig.js";

type ConfigV0 = {
  version: 0;
  npm?: Record<string, string>;
  cargo?: Record<string, string>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${FLUENCE_LOCK_CONFIG_FILE_NAME}`,
  title: FLUENCE_LOCK_CONFIG_FILE_NAME,
  description:
    "Defines a lock file for Fluence Project dependencies. When dependencies are installed - their exact versions are saved here.",
  properties: {
    npm: {
      type: "object",
      title: "npm dependencies",
      description:
        "A map of the exact npm dependency versions. CLI ensures dependencies are installed each time you run aqua",
      required: [],
      nullable: true,
    },
    cargo: {
      type: "object",
      title: "Cargo dependencies",
      description: `A map of the exact cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL`,
      required: [],
      nullable: true,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version"],
};

export const defaultFluenceLockConfig: LatestConfig = {
  version: 0,
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type FluenceLockConfig = InitializedConfig<LatestConfig>;
export type FluenceLockConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

export const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: FLUENCE_LOCK_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: () => projectRootDir,
  getSchemaDirPath: ensureFluenceDir,
};

export const initNewReadonlyFluenceLockConfig = (
  defaultConfig: LatestConfig
): Promise<InitializedReadonlyConfig<ConfigV0>> =>
  getReadonlyConfigInitFunction(
    initConfigOptions,
    (): ConfigV0 => defaultConfig
  )();
export const initNewFluenceLockConfig = (
  defaultConfig: LatestConfig
): Promise<InitializedConfig<ConfigV0>> =>
  getConfigInitFunction(initConfigOptions, (): ConfigV0 => defaultConfig)();
export const initFluenceLockConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyFluenceLockConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const fluenceLockSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
