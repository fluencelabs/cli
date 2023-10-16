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
  WORKERS_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  WORKERS_CONFIG_FILE_NAME,
  CLI_NAME,
  type ContractsENV,
  CONTRACTS_ENV,
} from "../../const.js";
import { getFluenceDir } from "../../paths.js";
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

export type Deal = WorkerInfo & {
  dealId: string;
  dealIdOriginal: string;
  chainNetwork: ContractsENV;
  chainNetworkId: number;
};

type Deals = Record<string, Deal>;

export type Host = WorkerInfo & {
  relayId: string;
  dummyDealId: string;
  installation_spells: {
    host_id: string;
    spell_id: string;
    worker_id: string;
  }[];
};

type Hosts = Record<string, Host>;

export type DealsAndHosts = {
  deals?: Deals;
  hosts?: Hosts;
};

type ConfigV0 = {
  version: 0;
} & DealsAndHosts;

const hostSchema: JSONSchemaType<Host> = {
  ...workerInfoSchema,
  properties: {
    ...workerInfoSchema.properties,
    dummyDealId: {
      type: "string",
    },
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
    "dummyDealId",
  ],
} as const;

const dealSchema: JSONSchemaType<Deal> = {
  ...workerInfoSchema,
  properties: {
    ...workerInfoSchema.properties,
    dealId: { type: "string" },
    dealIdOriginal: { type: "string" },
    chainNetwork: {
      type: "string",
      enum: CONTRACTS_ENV,
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
} as const;

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${WORKERS_CONFIG_FULL_FILE_NAME}`,
  title: WORKERS_CONFIG_FULL_FILE_NAME,
  type: "object",
  description: `A result of app deployment. This file is created automatically after successful deployment using \`${CLI_NAME} workers deploy\` command`,
  properties: {
    version: { type: "number", const: 0 },
    deals: {
      type: "object",
      description: "A map of created deals",
      additionalProperties: dealSchema,
      properties: {
        Worker_deployed_using_deals: dealSchema,
      },
      required: [],
      nullable: true,
    },
    hosts: {
      type: "object",
      description: "A map of deployed workers",
      additionalProperties: hostSchema,
      properties: {
        Worker_deployed_using_direct_hosting: hostSchema,
      },
      required: [],
      nullable: true,
    },
  },
  required: ["version"],
} as const;

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
  getConfigOrConfigDirPath: getFluenceDir,
};

const getDefault: GetDefaultConfig = () => {
  return `# A result of app deployment.
# This file is updated automatically after successful deployment using \`fluence workers deploy\` command

# config version
version: 0

# # A map of created deals
# deals:
#   # worker name
#   defaultWorker:
#     # worker CID
#     definition: bafkreigvy3k4racm6i6vvavtr5mdkllmfi2lfkmdk72gnzwk7zdnhajw4y
#     # ISO timestamp of the time when the worker was deployed
#     timestamp: 2023-07-07T11:23:52.353Z
#     # deal ID used in aqua to resolve workers
#     dealId: 799c4beb18ae084d57a90582c2cb8bb19098139e
#     # original deal ID that you get after signing the contract
#     dealIdOriginal: "0x799C4BEB18Ae084D57a90582c2Cb8Bb19098139E"
#     # network name that was used when deploying worker
#     chainNetwork: testnet
#     # network ID that was used when deploying worker
#     chainNetworkId: 1313161555

# # A map of deployed workers
# hosts:
#   # worker name
#   defaultWorker:
#     # worker CID
#     definition: bafkreicoctafgctpxf7jk4nynpnma4wdxpcecjtspsjmuidmag6enctnqa
#     # worker installation spells
#     # host_id and worker_id can be used to access the worker
#     installation_spells:
#       - host_id: 12D3KooWBM3SdXWqGaawQDGQ6JprtwswEg3FWGvGhmgmMez1vRbR
#         spell_id: 9dbe4003-1232-4a20-9d52-5651c5cf4c5c
#         worker_id: 12D3KooWLBQAdDFXz9vWnmgs6MyMfo25bhUTUEiLPsG94ppYq35w
#     # ISO timestamp of the time when the worker was deployed
#     timestamp: 2023-07-07T11:39:57.610Z
#     # relay that was used when connecting to the network
#     relayId: 12D3KooWPisGn7JhooWhggndz25WM7vQ2JmA121EV8jUDQ5xMovJ
`;
};

export const initNewWorkersConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault,
);

export const initNewWorkersConfigReadonly = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault,
);

export const initReadonlyWorkersConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const workersSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
