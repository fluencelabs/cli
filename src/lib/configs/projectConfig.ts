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

import { CONFIG_FILE_NAME, DEFAULT_KEY_PAIR_NAME_PROPERTY } from "../const";

import { UpdateConfig, getConfig } from "./ensureConfig";

const ajv = new Ajv();

type DeploymentConfig0 = {
  name: string;
  services: Array<{ name: string; peerId: string; count?: number }>;
  knownRelays?: Array<string>;
};

export type DeploymentConfig = DeploymentConfig0;

const deploymentConfigSchema0: JSONSchemaType<DeploymentConfig0> = {
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
          count: { type: "number", nullable: true, minimum: 1 },
        },
        required: ["name", "peerId"],
      },
    },
    knownRelays: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
  },
  required: ["name", "services"],
};

type Config0 = {
  version: 0;
  [DEFAULT_KEY_PAIR_NAME_PROPERTY]?: string;
  deploymentConfigs: Array<DeploymentConfig0>;
};

export type ProjectConfig = Config0;

type Configs = Config0;

const getDefaultConfig = (): ProjectConfig => ({
  version: 0,
  deploymentConfigs: [],
});

const configSchema0: JSONSchemaType<Config0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    [DEFAULT_KEY_PAIR_NAME_PROPERTY]: { type: "string", nullable: true },
    deploymentConfigs: {
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

export const getProjectConfig = async (
  configDir: string
): Promise<[ProjectConfig, UpdateConfig<ProjectConfig>] | Error> =>
  getConfig({
    configDir,
    configName: CONFIG_FILE_NAME,
    migrations,
    validateConfig,
    getDefaultConfig,
  });
