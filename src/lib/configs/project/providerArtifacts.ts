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
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_ARTIFACTS_CONFIG_FILE_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
import {
  ensureProviderArtifactsConfigPath,
  getFluenceDir,
} from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

type OfferConfig = {
  id: string;
};

type ConfigV0 = {
  version: 0;
  offers: Record<string, OfferConfig>;
};

const offerConfig = {
  type: "object",
  additionalProperties: false,
  description: "Created offer info",
  properties: {
    id: { type: "string", description: "Offer id" },
  },
  required: ["id"],
} as const satisfies JSONSchemaType<OfferConfig>;

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_ARTIFACTS_CONFIG_FILE_NAME}`,
  title: PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  description: `Defines artifacts created by the provider`,
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "number", const: 0, description: "Config version" },
    offers: {
      type: "object",
      description: "Created offers",
      additionalProperties: offerConfig,
      properties: {
        noxName: offerConfig,
      },
      required: [],
    },
  },
  required: ["version", "offers"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProviderArtifactsConfig = InitializedConfig<LatestConfig>;
export type ProviderArtifactsConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

function getInitConfigOptions() {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: PROVIDER_ARTIFACTS_CONFIG_FILE_NAME,
    getConfigOrConfigDirPath: () => {
      return ensureProviderArtifactsConfigPath();
    },
    getSchemaDirPath: getFluenceDir,
  };
}

export function initReadonlyProviderArtifactsConfig() {
  return getReadonlyConfigInitFunction(getInitConfigOptions())();
}

export async function initNewReadonlyProviderArtifactsConfig() {
  return getReadonlyConfigInitFunction(getInitConfigOptions(), () => {
    return getDefault();
  })();
}

export async function initNewProviderArtifactsConfig() {
  return getConfigInitFunction(getInitConfigOptions(), () => {
    return getDefault();
  })();
}

function getDefault() {
  return `
version: 0
offers: {}
`;
}

export const providerArtifactsSchema: JSONSchemaType<LatestConfig> =
  configSchemaV0;
