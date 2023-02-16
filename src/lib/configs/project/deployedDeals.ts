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
  ChainNetwork,
  CHAIN_NETWORKS,
  DEPLOYED_DEALS_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const.js";
import { ensureFluenceDir } from "../../paths.js";
import {
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  GetDefaultConfig,
  getConfigInitFunction,
} from "../initConfig.js";

type ConfigV0 = {
  version: 0;
  deals: {
    workerName: string;
    workerCID: string;
    dealAddress: string;
    timestamp: string;
    network: ChainNetwork;
  }[];
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${DEPLOYED_DEALS_CONFIG_FILE_NAME}`,
  title: DEPLOYED_DEALS_CONFIG_FILE_NAME,
  type: "object",
  description:
    "A result of deals deployment. This file is created automatically after successful deployment using `fluence deal deploy` command",
  properties: {
    version: { type: "number", const: 0 },
    deals: {
      type: "array",
      description: "A list of deployed deals",
      items: {
        type: "object",
        properties: {
          workerName: { type: "string" },
          workerCID: { type: "string" },
          dealAddress: { type: "string" },
          network: { type: "string", enum: CHAIN_NETWORKS },
          timestamp: {
            type: "string",
            description: "ISO timestamp of the time when the deal was deployed",
          },
        },
        required: [
          "workerName",
          "workerCID",
          "dealAddress",
          "timestamp",
          "network",
        ],
      },
    },
  },
  required: ["version"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DeployedDealsConfig = InitializedConfig<LatestConfig>;
export type DeployedDealsConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DEPLOYED_DEALS_CONFIG_FILE_NAME,
  getConfigDirPath: ensureFluenceDir,
};

const getDefault: GetDefaultConfig<LatestConfig> = () => ({
  version: 0,
  deals: [],
});

export const initReadonlyDeployedDealsConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);

export const initDeployedDealsConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);

export const deployedDealsSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
