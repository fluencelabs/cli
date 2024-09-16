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
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  ENV_CONFIG_FILE_NAME,
  ENV_CONFIG_FULL_FILE_NAME,
  FLUENCE_ENVS,
  FLUENCE_ENVS_OLD,
  fluenceOldEnvToNewEnv,
  TOP_LEVEL_SCHEMA_ID,
  type FluenceEnv,
  type FluenceEnvOld,
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
  fluenceEnv?: FluenceEnvOld;
  version: 0;
};

const configSchemaV0Obj = {
  type: "object",
  properties: {
    fluenceEnv: {
      title: "Fluence environment",
      description: `Fluence environment to connect to`,
      type: "string",
      enum: [...FLUENCE_ENVS_OLD],
      nullable: true,
    },
    version: { type: "integer", const: 0 },
  },
  required: ["version"],
  additionalProperties: false,
} as const satisfies JSONSchemaType<ConfigV0>;

const configSchemaV0: JSONSchemaType<ConfigV0> = configSchemaV0Obj;

type ConfigV1 = {
  fluenceEnv?: FluenceEnv;
  version: 1;
};

const configSchemaV1Obj = {
  type: "object",
  properties: {
    fluenceEnv: {
      title: "Fluence environment",
      description: `Fluence environment to connect to`,
      type: "string",
      enum: [...FLUENCE_ENVS],
      nullable: true,
    },
    version: { type: "integer", const: 1 },
  },
  required: ["version"],
  additionalProperties: false,
} as const satisfies JSONSchemaType<ConfigV1>;

const latestSchemaObj = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${ENV_CONFIG_FULL_FILE_NAME}`,
  title: ENV_CONFIG_FULL_FILE_NAME,
  description: `Defines user project preferences`,
  ...configSchemaV1Obj,
};

const latestSchema: JSONSchemaType<LatestConfig> = latestSchemaObj;

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

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

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    const { fluenceEnv } = config;

    return {
      version: 1,
      ...(fluenceEnv === undefined
        ? {}
        : { fluenceEnv: fluenceOldEnvToNewEnv(fluenceEnv) }),
    };
  },
];

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type EnvConfig = InitializedConfig<LatestConfig>;
export type EnvConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, latestSchema],
  latestSchema,
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

export const envSchema: JSONSchemaType<LatestConfig> = latestSchema;
