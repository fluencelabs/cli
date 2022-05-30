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

import fsPromises from "node:fs/promises";

import type { JSONSchemaType } from "ajv";

import { AUTO_GENERATED, CONFIG_FILE_NAME } from "../../const";
import { getRandomRelayId } from "../../multiaddr";
import { getArtifactsPath } from "../../pathsGetters/getArtifactsPath";
import { getProjectDotFluenceDir } from "../../pathsGetters/getProjectDotFluenceDir";
import {
  GetDefaultConfig,
  initConfig,
  InitConfigOptions,
  InitializedConfig,
  initReadonlyConfig,
  Migrations,
} from "../initConfig";

type DeploymentConfigV0 = {
  name: string;
  services: Array<{ name: string; peerId: string; count?: number }>;
  knownRelays?: Array<string>;
};

export type DeploymentConfig = DeploymentConfigV0;

const deploymentConfigSchemaV0: JSONSchemaType<DeploymentConfigV0> = {
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
      minItems: 1,
    },
    knownRelays: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
  },
  required: ["name", "services"],
};

type ConfigV0 = {
  version: 0;
  defaultDeploymentConfig: DeploymentConfigV0;
  deploymentConfigs: Array<DeploymentConfigV0>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    defaultDeploymentConfig: deploymentConfigSchemaV0,
    deploymentConfigs: {
      type: "array",
      items: deploymentConfigSchemaV0,
    },
  },
  required: ["version", "deploymentConfigs"],
};

const generateDefaultDeploymentConfig =
  async (): Promise<DeploymentConfigV0> => {
    const relayId = getRandomRelayId();
    const artifactsPath = getArtifactsPath();

    try {
      await fsPromises.access(artifactsPath);
    } catch {
      throw new Error(
        `Nothing to deploy: There is no ${artifactsPath} directory`
      );
    }

    const services = (
      await fsPromises.readdir(artifactsPath, { withFileTypes: true })
    )
      .filter((dirent): boolean => dirent.isDirectory())
      .map(({ name }): DeploymentConfig["services"][0] => ({
        name,
        peerId: relayId,
      }));

    if (services.length === 0) {
      throw new Error(
        `Nothing to deploy: There are no services in the ${artifactsPath} directory`
      );
    }

    return {
      name: AUTO_GENERATED,
      services,
    };
  };

const getDefaultConfig: GetDefaultConfig<
  LatestConfig
> = async (): Promise<LatestConfig> => ({
  version: 0,
  defaultDeploymentConfig: await generateDefaultDeploymentConfig(),
  deploymentConfigs: [],
});

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProjectConfig = InitializedConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: CONFIG_FILE_NAME,
  getPath: getProjectDotFluenceDir,
  getDefault: getDefaultConfig,
};

export const initProjectConfig = initConfig(initConfigOptions);
export const initReadonlyProjectConfig = initReadonlyConfig(initConfigOptions);
