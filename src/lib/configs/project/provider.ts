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

import { PROVIDER_CONFIG_FILE_NAME } from "../../const.js";
import { getFluenceDir, projectRootDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
  type InitConfigOptions,
} from "../initConfig.js";

export type Offer = {
  minPricePerEpoch: number;
  minCollateral: number;
  maxCollateral: number;
  effectors: Array<string>;
};

export type ComputePeer = {
  peerId: string;
  slots: number;
};

type ConfigV0 = {
  offer: Offer;
  computePeers: Array<ComputePeer>;
  version: 0;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    offer: {
      type: "object",
      properties: {
        minPricePerEpoch: { type: "number" },
        minCollateral: { type: "number" },
        maxCollateral: { type: "number" },
        effectors: { type: "array", items: { type: "string" } },
      },
      required: [
        "minPricePerEpoch",
        "minCollateral",
        "maxCollateral",
        "effectors",
      ],
    },
    computePeers: {
      type: "array",
      items: {
        type: "object",
        properties: {
          peerId: { type: "string" },
          slots: { type: "number" },
        },
        required: ["peerId", "slots"],
      },
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "computePeers", "offer"],
};

const getConfigOrConfigDirPath = () => {
  return projectRootDir;
};

const getDefaultConfig = async ({
  computePeers,
  offer,
}: UserProvidedConfig) => {
  const { yamlDiffPatch } = await import("yaml-diff-patch");

  return () => {
    return `# Defines Provider configuration
# You can use \`fluence provider init\` command to generate this config template

${yamlDiffPatch("", {}, { offer })}
${yamlDiffPatch("", {}, { computePeers })}

# config version
version: 0
`;
  };
};

const getDefault = (providedByUser: UserProvidedConfig) => {
  return getDefaultConfig(providedByUser);
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProviderConfig = InitializedConfig<LatestConfig>;
export type ProviderConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const validate: ConfigValidateFunction<LatestConfig> = () => {
  return true;
};

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: PROVIDER_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath,
  getSchemaDirPath: getFluenceDir,
  validate,
};

export type UserProvidedConfig = Omit<LatestConfig, "version">;

export const initNewProviderConfig = async (
  providedByUser: UserProvidedConfig,
) => {
  return getConfigInitFunction(
    initConfigOptions,
    await getDefault(providedByUser),
  )();
};

export const initProviderConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyProviderConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const providerSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
