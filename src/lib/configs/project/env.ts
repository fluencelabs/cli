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
  ENV_CONFIG_FILE_NAME,
  ENV_CONFIG_FULL_FILE_NAME,
  FLUENCE_ENVS,
  TOP_LEVEL_SCHEMA_ID,
  type FluenceEnv,
} from "../../const.js";
import { getFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type GetDefaultConfig,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

type ConfigV0 = {
  fluenceEnv?: FluenceEnv;
  version: 0;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${ENV_CONFIG_FULL_FILE_NAME}`,
  title: ENV_CONFIG_FULL_FILE_NAME,
  type: "object",
  description: `Defines user project preferences`,
  properties: {
    fluenceEnv: {
      title: "Fluence environment",
      description: `Fluence environment to connect to`,
      type: "string",
      enum: [...FLUENCE_ENVS],
      nullable: true,
    },
    version: { type: "integer", const: 0 },
  },
  required: ["version"],
  additionalProperties: false,
};

const getDefault = (fluenceEnv: FluenceEnv | undefined): GetDefaultConfig => {
  return () => {
    return `# Defines project preferences
# config version
version: 0

# Fluence environment to connect to
${`${fluenceEnv === undefined ? "# " : ""}fluenceEnv: "${fluenceEnv}"`}
`;
  };
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type EnvConfig = InitializedConfig<LatestConfig>;
export type EnvConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: ENV_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: getFluenceDir,
};

export const initNewEnvConfig = (fluenceEnv?: FluenceEnv) => {
  return getConfigInitFunction(initConfigOptions, getDefault(fluenceEnv))();
};

export const initEnvConfig = getConfigInitFunction(initConfigOptions);

export const initReadonlyEnvConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const envSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
