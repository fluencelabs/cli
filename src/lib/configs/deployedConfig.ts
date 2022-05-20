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

import Ajv, { JSONSchemaType } from "ajv";

import { DEPLOYED_FILE_NAME } from "../const";

import { UpdateConfig, getConfig } from "./ensureConfig";

const ajv = new Ajv();

type DeployedServiceConfig0 = {
  name: string;
  peerId: string;
  serviceId: string;
  blueprintId: string;
};

export type DeployedServiceConfig = DeployedServiceConfig0;

type Deployed0 = {
  name: string;
  services: Array<DeployedServiceConfig0>;
  keyPairName: string;
  timestamp: string;
  knownRelays?: Array<string>;
};

export type Deployed = Deployed0;

const deploymentConfigSchema0: JSONSchemaType<Deployed0> = {
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

type Config0 = {
  version: 0;
  deployed: Array<Deployed0>;
};

export type DeployedConfig = Config0;

type Configs = Config0;

const getDefaultConfig = (): DeployedConfig => ({
  version: 0,
  deployed: [],
});

const configSchema0: JSONSchemaType<Config0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    deployed: {
      type: "array",
      items: deploymentConfigSchema0,
      nullable: true,
    },
  },
  required: ["version"],
};

const configSchema: JSONSchemaType<Configs> = {
  oneOf: [configSchema0],
} as const;

const validateConfig = ajv.compile(configSchema);

const migrations: Array<(config: Configs) => Configs> = [];

export const getDeployedConfig = async (
  configDir: string
): Promise<[DeployedConfig, UpdateConfig<DeployedConfig>] | Error> =>
  getConfig({
    configDir,
    configName: DEPLOYED_FILE_NAME,
    migrations,
    validateConfig,
    getDefaultConfig,
  });
