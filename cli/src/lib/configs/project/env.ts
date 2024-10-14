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

import type { Deployment } from "@fluencelabs/deal-ts-clients";
import type { JSONSchemaType } from "ajv";

import { CHAIN_ENV, DEFAULT_PUBLIC_FLUENCE_ENV } from "../../../common.js";
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  ENV_CONFIG_FILE_NAME,
  ENV_CONFIG_FULL_FILE_NAME,
  FLUENCE_ENVS_OLD,
  fluenceOldEnvToNewEnv,
  TOP_LEVEL_SCHEMA_ID,
  type FluenceEnv,
  type FluenceEnvOld,
} from "../../const.js";
import { numToStr } from "../../helpers/typesafeStringify.js";
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
  relays?: Array<string>;
  subgraphUrl?: string;
  rpcUrl?: string;
  blockScoutUrl?: string;
  chainId?: number;
  deployment?: Partial<Deployment>;
  version: 1;
};

const configSchemaV1Obj = {
  type: "object",
  properties: {
    fluenceEnv: {
      title: "Fluence environment",
      description: `Fluence environment to connect to`,
      type: "string",
      enum: [...CHAIN_ENV],
      nullable: true,
    },
    relays: {
      type: "array",
      description: `List of custom relay multiaddresses to use when connecting to Fluence network`,
      items: { type: "string" },
      minItems: 1,
      nullable: true,
    },
    subgraphUrl: {
      type: "string",
      description: `Subgraph URL to use`,
      format: "uri",
      nullable: true,
    },
    rpcUrl: {
      type: "string",
      description: `RPC URL to use`,
      format: "uri",
      nullable: true,
    },
    blockScoutUrl: {
      type: "string",
      description: `BlockScout URL to use`,
      format: "uri",
      nullable: true,
    },
    chainId: {
      type: "number",
      description: `Chain ID to use`,
      nullable: true,
    },
    deployment: {
      type: "object",
      description: `Deployed contract address overrides`,
      nullable: true,
      required: [],
      additionalProperties: false,
      properties: {
        usdc: { type: "string", nullable: true },
        multicall3: { type: "string", nullable: true },
        diamond: { type: "string", nullable: true },
      },
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
version: ${numToStr(latestSchemaObj.properties.version.const)}

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
