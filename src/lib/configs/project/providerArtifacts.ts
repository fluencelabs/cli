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

import { join } from "path";

import type { JSONSchemaType } from "ajv";

import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_ARTIFACTS_CONFIG_FILE_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
  DEFAULT_PUBLIC_FLUENCE_ENV,
} from "../../const.js";
import {
  ensureProviderArtifactsConfigPath,
  getFluenceDir,
} from "../../paths.js";
import { fluenceEnvPrompt } from "../../resolveFluenceEnv.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type InitConfigOptions,
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
  description: `Defines artifacts created by the provider`,
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "integer", const: 0, description: "Config version" },
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

type ConfigV1 = {
  version: 1;
  offers: Partial<Record<FluenceEnv, Record<string, OfferConfig>>>;
};

const offersConfigV1 = {
  type: "object",
  description: "Created offers",
  additionalProperties: offerConfig,
  properties: {
    noxName: offerConfig,
  },
  required: [],
  nullable: true,
} as const satisfies JSONSchemaType<Record<string, OfferConfig>>;

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_ARTIFACTS_CONFIG_FILE_NAME}`,
  title: PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  description: `Defines artifacts created by the provider`,
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "integer", const: 1, description: "Config version" },
    offers: {
      type: "object",
      description: "Created offers",
      additionalProperties: false,
      properties: {
        dar: offersConfigV1,
        custom: offersConfigV1,
        kras: offersConfigV1,
        local: offersConfigV1,
        stage: offersConfigV1,
      },
      required: [],
    },
  },
  required: ["version", "offers"],
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    const configPath = join(
      getFluenceDir(),
      PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
    );

    const offers: ConfigV1["offers"] = {};

    for (const [offerName, offer] of Object.entries(config.offers)) {
      const env = await fluenceEnvPrompt(
        `Select the environment that you used for creating offer ${offerName} with offerId: ${offer.id} at ${configPath}`,
        DEFAULT_PUBLIC_FLUENCE_ENV,
      );

      const dealsForEnv = offers[env] ?? {};
      dealsForEnv[offerName] = offer;
      offers[env] = dealsForEnv;
    }

    return { version: 1, offers };
  },
];

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type ProviderArtifactsConfig = InitializedConfig<LatestConfig>;
export type ProviderArtifactsConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

function getInitConfigOptions(): InitConfigOptions<Config, LatestConfig> {
  return {
    allSchemas: [configSchemaV0, configSchemaV1],
    latestSchema: configSchemaV1,
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
  configSchemaV1;
