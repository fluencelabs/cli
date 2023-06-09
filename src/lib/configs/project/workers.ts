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
  type ChainNetwork,
  CHAIN_NETWORKS,
  WORKERS_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const.js";
import { ensureFluenceDir } from "../../paths.js";
import {
  getReadonlyConfigInitFunction,
  getConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type GetDefaultConfig,
} from "../initConfig.js";

type WorkerInfo = {
  timestamp: string;
  definition: string;
};

const workerInfoSchema = {
  type: "object",
  properties: {
    definition: { type: "string" },
    timestamp: {
      type: "string",
      description: "ISO timestamp of the time when the worker was deployed",
    },
  },
  required: ["timestamp", "definition"],
} as const satisfies JSONSchemaType<WorkerInfo>;

type ConfigV0 = {
  version: 0;
  deals?: Record<
    string,
    WorkerInfo & {
      dealId: string;
      dealIdOriginal: string;
      chainNetwork: ChainNetwork;
      chainNetworkId: number;
    }
  >;
  hosts?: Record<
    string,
    WorkerInfo & {
      relayId: string;
      installation_spells: {
        host_id: string;
        spell_id: string;
        worker_id: string;
      }[];
    }
  >;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${WORKERS_CONFIG_FILE_NAME}`,
  title: WORKERS_CONFIG_FILE_NAME,
  type: "object",
  description:
    "A result of app deployment. This file is created automatically after successful deployment using `fluence workers deploy` command",
  properties: {
    version: { type: "number", const: 0 },
    deals: {
      type: "object",
      description: "A map of created deals",
      additionalProperties: {
        ...workerInfoSchema,
        properties: {
          ...workerInfoSchema.properties,
          dealId: { type: "string" },
          dealIdOriginal: { type: "string" },
          chainNetwork: {
            type: "string",
            enum: CHAIN_NETWORKS,
          },
          chainNetworkId: { type: "number" },
        },
        required: [
          ...workerInfoSchema.required,
          "dealId",
          "dealIdOriginal",
          "chainNetwork",
          "chainNetworkId",
        ],
      },
      required: [],
      nullable: true,
    },
    hosts: {
      type: "object",
      description: "A map of deployed workers",
      additionalProperties: {
        ...workerInfoSchema,
        properties: {
          ...workerInfoSchema.properties,
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
          relayId: { type: "string" },
        },
        required: [
          ...workerInfoSchema.required,
          "installation_spells",
          "relayId",
        ],
      },
      required: [],
      nullable: true,
    },
  },
  required: ["version"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type WorkersConfig = InitializedConfig<LatestConfig>;
export type WorkersConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: WORKERS_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureFluenceDir,
};

const getDefault: GetDefaultConfig<LatestConfig> = () => {
  return {
    version: 0,
  };
};

export const initNewWorkersConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);

export const initReadonlyWorkersConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const workersSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
