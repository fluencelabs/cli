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
  DEPLOYED_CONFIG_FILE_NAME,
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
  workers: Record<
    string,
    {
      installation_spells: {
        host_id: string;
        spell_id: string;
        worker_id: string;
      }[];
      timestamp: string;
      definition: string;
      workerCID?: string | undefined;
      dealId?: string | undefined;
      dealIdOriginal?: string | undefined;
      chainNetwork?: ChainNetwork | undefined;
      chainNetworkId?: number | undefined;
    }
  >;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${DEPLOYED_CONFIG_FILE_NAME}`,
  title: DEPLOYED_CONFIG_FILE_NAME,
  type: "object",
  description:
    "A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command",
  properties: {
    version: { type: "number", const: 0 },
    workers: {
      type: "object",
      description: "A map of deployed workers",
      additionalProperties: {
        type: "object",
        properties: {
          installation_spells: {
            type: "array",
            description: "A list of installation spells",
            items: {
              type: "object",
              properties: {
                host_id: { type: "string" },
                spell_id: { type: "string" },
                worker_id: { type: "string" },
              },
              required: ["host_id", "spell_id", "worker_id"],
            },
          },
          definition: { type: "string" },
          workerCID: { type: "string", nullable: true },
          dealId: { type: "string", nullable: true },
          dealIdOriginal: { type: "string", nullable: true },
          chainNetwork: {
            type: "string",
            enum: CHAIN_NETWORKS,
            nullable: true,
          },
          chainNetworkId: { type: "number", nullable: true },
          timestamp: {
            type: "string",
            description:
              "ISO timestamp of the time when the worker was deployed",
          },
        },
        required: ["installation_spells", "timestamp", "definition"],
      },
      required: [],
    },
  },
  required: ["version"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DeployedConfig = InitializedConfig<LatestConfig>;
export type DeployedConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DEPLOYED_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureFluenceDir,
};

const getDefault: GetDefaultConfig<LatestConfig> = () => ({
  version: 0,
  workers: {},
});

export const initNewReadonlyDeployedConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);

export const initNewDeployedConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);

export const initReadonlyDeployedConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const initDeployedConfig = getConfigInitFunction(initConfigOptions);

export const deployedSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
