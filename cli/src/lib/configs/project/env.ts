/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type { JSONSchemaType } from "ajv";

import { DEFAULT_PUBLIC_FLUENCE_ENV } from "../../../common.js";
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
${fluenceEnv === undefined ? `# fluenceEnv: ${DEFAULT_PUBLIC_FLUENCE_ENV}` : `fluenceEnv: "${fluenceEnv}"`}
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
