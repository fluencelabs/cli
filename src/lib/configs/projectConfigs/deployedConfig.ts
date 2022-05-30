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

import { DEPLOYED_FILE_NAME } from "../../const";
import { getProjectDotFluenceDir } from "../../pathsGetters/getProjectDotFluenceDir";
import {
  GetDefaultConfig,
  initConfig,
  InitConfigOptions,
  InitializedConfig,
  initReadonlyConfig,
  Migrations,
} from "../initConfig";

type DeployedServiceConfigV0 = {
  name: string;
  peerId: string;
  serviceId: string;
  blueprintId: string;
};

export type DeployedServiceConfig = DeployedServiceConfigV0;

type DeployedV0 = {
  name: string;
  services: Array<DeployedServiceConfigV0>;
  keyPairName: string;
  timestamp: string;
  knownRelays?: Array<string>;
};

export type Deployed = DeployedV0;

const deploymentConfigSchemaV0: JSONSchemaType<DeployedV0> = {
  type: "object",
  properties: {
    name: { type: "string" },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          peerId: { type: "string" },
          serviceId: { type: "string" },
          blueprintId: { type: "string" },
        },
        required: ["name", "peerId", "serviceId", "blueprintId"],
      },
    },
    keyPairName: { type: "string" },
    timestamp: { type: "string" },
    knownRelays: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
  },
  required: ["name", "services", "keyPairName", "timestamp"],
};

type ConfigV0 = {
  version: 0;
  deployed: Array<DeployedV0>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    deployed: {
      type: "array",
      items: deploymentConfigSchemaV0,
      nullable: true,
    },
  },
  required: ["version"],
};

const getDefaultConfig: GetDefaultConfig<LatestConfig> = (): LatestConfig => ({
  version: 0,
  deployed: [],
});

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DeployedConfig = InitializedConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DEPLOYED_FILE_NAME,
  getPath: getProjectDotFluenceDir,
  getDefault: getDefaultConfig,
};

export const initDeployedConfig = initConfig(initConfigOptions);
export const initReadonlyDeployedConfig = initReadonlyConfig(initConfigOptions);
