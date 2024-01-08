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
import { yamlDiffPatch } from "yaml-diff-patch";

import {
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FILE_NAME,
  LOCAL_NET_WALLET_KEYS,
} from "../../const.js";
import { getSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { ensureProviderSecretsConfigPath, getFluenceDir } from "../../paths.js";
import {
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

import type { ProviderConfigReadonly } from "./provider.js";

type SecretsConfig = {
  networkKey: string;
  signingWallet: string;
};

type ConfigV0 = {
  version: 0;
  noxes: Record<string, SecretsConfig>;
};

const secretesConfig = {
  type: "object",
  additionalProperties: false,
  description:
    "Secret keys for noxes. You can put it near provider config and populate it in CI",
  properties: {
    networkKey: {
      type: "string",
      description: "Network key for the nox",
    },
    signingWallet: {
      type: "string",
      description: "Signing wallet for built-in decider system service in nox",
    },
  },
  required: ["networkKey", "signingWallet"],
} as const satisfies JSONSchemaType<SecretsConfig>;

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  description: `Defines secrets config used for provider set up`,
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "number", const: 0, description: "Config version" },
    noxes: {
      type: "object",
      description: "Secret keys for noxes by name",
      additionalProperties: secretesConfig,
      properties: {
        noxName: secretesConfig,
      },
      required: [],
    },
  },
  required: ["version", "noxes"],
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProviderSecretesConfig = InitializedConfig<LatestConfig>;
export type ProviderSecretesConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

function getInitConfigOptions() {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: PROVIDER_SECRETS_CONFIG_FILE_NAME,
    getConfigOrConfigDirPath: () => {
      return ensureProviderSecretsConfigPath();
    },
    getSchemaDirPath: getFluenceDir,
  };
}

export function initReadonlyProviderSecretsConfig() {
  return getReadonlyConfigInitFunction(getInitConfigOptions())();
}

export async function initNewReadonlyProviderSecretsConfig(
  providerConfig: ProviderConfigReadonly,
) {
  const noxes: Record<string, SecretsConfig> = Object.fromEntries(
    await Promise.all(
      Object.keys(providerConfig.computePeers).map(async (name, i) => {
        return [
          name,
          {
            networkKey: (await getSecretKeyOrReturnExisting(name)).secretKey,
            signingWallet:
              // because we use length we can be sure it's never undefined
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              LOCAL_NET_WALLET_KEYS[i % LOCAL_NET_WALLET_KEYS.length] as string,
          },
        ] as const;
      }),
    ),
  );

  return getReadonlyConfigInitFunction(getInitConfigOptions(), () => {
    return `
version: 0
${yamlDiffPatch(
  "",
  {},
  {
    noxes,
  },
)}
`;
  })();
}

export const providerSecretsSchema: JSONSchemaType<LatestConfig> =
  configSchemaV0;
