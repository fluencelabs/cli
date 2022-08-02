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
  AQUA_NPM_DEPENDENCY,
  cargoDependencyList,
  CARGO_GENERATE_CARGO_DEPENDENCY,
  CommandObj,
  DEPENDENCY_CONFIG_FILE_NAME,
  MARINE_CARGO_DEPENDENCY,
  MREPL_CARGO_DEPENDENCY,
  npmDependencyList,
} from "../../const";
import { ensureUserFluenceDir } from "../../paths";
import { getIsStringUnion } from "../../typeHelpers";
import {
  GetDefaultConfig,
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig";

export const dependencyList = [
  ...npmDependencyList,
  ...cargoDependencyList,
] as const;
export type DependencyName = typeof dependencyList[number];
type DependencyMap = Partial<Record<DependencyName, string>>;

export const getVersionToUse = async (
  recommendedVersion: string,
  name: DependencyName,
  commandObj: CommandObj
): Promise<string> => {
  const version = (await initReadonlyDependencyConfig(commandObj))
    ?.dependency?.[name];
  return typeof version === "string" ? version : recommendedVersion;
};

export const isDependency = getIsStringUnion(dependencyList);

type ConfigV0 = {
  version: 0;
  dependency?: DependencyMap;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    dependency: {
      type: "object",
      properties: {
        [AQUA_NPM_DEPENDENCY]: { type: "string", nullable: true },
        [MARINE_CARGO_DEPENDENCY]: { type: "string", nullable: true },
        [MREPL_CARGO_DEPENDENCY]: { type: "string", nullable: true },
        [CARGO_GENERATE_CARGO_DEPENDENCY]: { type: "string", nullable: true },
      },
      required: [],
      nullable: true,
    },
  },
  required: ["version"],
};

const getDefault: GetDefaultConfig<LatestConfig> = (): LatestConfig => ({
  version: 0,
});

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type UserSecretsConfig = InitializedConfig<LatestConfig>;
export type UserSecretsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DEPENDENCY_CONFIG_FILE_NAME,
  getConfigDirPath: ensureUserFluenceDir,
};

export const initDependencyConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initReadonlyDependencyConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);
