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

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import {
  PROVIDER_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
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
  minPricePerWorkerEpoch: number;
  maxCollateralPerWorker: number;
  computePeers: Array<string>;
  effectors?: Array<string>;
};

export type ComputePeer = {
  worker?: number;
};

type ConfigV0 = {
  offers?: Record<string, Offer>;
  computePeers: Record<string, ComputePeer>;
  version: 0;
};

const offerSchema: JSONSchemaType<Offer> = {
  type: "object",
  properties: {
    minPricePerWorkerEpoch: { type: "number" },
    maxCollateralPerWorker: { type: "number" },
    computePeers: {
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
    },
    effectors: { type: "array", items: { type: "string" }, nullable: true },
  },
  required: [
    "minPricePerWorkerEpoch",
    "maxCollateralPerWorker",
    "computePeers",
  ],
};

const computePeerSchema: JSONSchemaType<ComputePeer> = {
  type: "object",
  properties: {
    worker: { type: "number", nullable: true },
  },
  required: [],
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_CONFIG_FULL_FILE_NAME,
  description: `Defines config used for provider set up`,
  type: "object",
  properties: {
    offers: {
      type: "object",
      additionalProperties: offerSchema,
      properties: {
        Offer: offerSchema,
      },
      nullable: true,
      required: [],
    },
    computePeers: {
      type: "object",
      additionalProperties: computePeerSchema,
      properties: {
        ComputePeer: computePeerSchema,
      },
      required: [],
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "computePeers"],
};

const getConfigOrConfigDirPath = () => {
  return projectRootDir;
};

const getDefaultConfig = async ({
  computePeers,
  offers,
}: UserProvidedConfig) => {
  const { yamlDiffPatch } = await import("yaml-diff-patch");

  return () => {
    return `# Defines Provider configuration
# You can use \`fluence provider init\` command to generate this config template

${offers === undefined ? "" : yamlDiffPatch("", {}, { offers })}
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

const validate: ConfigValidateFunction<LatestConfig> = (config) => {
  const invalid: Array<{
    offerName: string;
    missingComputePeerNames: Array<string>;
  }> = [];

  for (const [offerName, { computePeers }] of Object.entries(
    config.offers ?? {},
  )) {
    const missingComputePeerNames = computePeers.filter((cp) => {
      return !(cp in config.computePeers);
    });

    if (missingComputePeerNames.length > 0) {
      invalid.push({ offerName, missingComputePeerNames });
    }
  }

  if (invalid.length > 0) {
    return invalid
      .map(({ offerName, missingComputePeerNames }) => {
        return `Offer ${color.yellow(
          offerName,
        )} has computePeers missing from the config's top level computePeers property: ${color.yellow(
          missingComputePeerNames.join(", "),
        )}`;
      })
      .join("\n");
  }

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
