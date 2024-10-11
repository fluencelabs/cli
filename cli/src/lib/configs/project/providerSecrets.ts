/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import type { JSONSchemaType } from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

import {
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FILE_NAME,
} from "../../const.js";
import { genSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { ensureProviderSecretsConfigPath, getFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type InitConfigOptions,
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
      format: "hex",
      description: "Signing wallet for built-in decider system service in nox",
    },
  },
  required: ["networkKey", "signingWallet"],
} as const satisfies JSONSchemaType<SecretsConfig>;

const configSchemaV0 = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  description: `Defines secrets config used for provider set up`,
  type: "object",
  additionalProperties: false,
  properties: {
    version: { type: "integer", const: 0, description: "Config version" },
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
} as const satisfies JSONSchemaType<ConfigV0>;

const latestSchema = configSchemaV0 satisfies JSONSchemaType<LatestConfig>;

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProviderSecretesConfig = InitializedConfig<LatestConfig>;
export type ProviderSecretesConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

function getInitConfigOptions(): InitConfigOptions<Config, LatestConfig> {
  return {
    allSchemas: [configSchemaV0],
    latestSchema,
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
  return getReadonlyConfigInitFunction(getInitConfigOptions(), () => {
    return getDefault(providerConfig);
  })();
}

export async function initNewProviderSecretsConfig(
  providerConfig: ProviderConfigReadonly,
) {
  return getConfigInitFunction(getInitConfigOptions(), () => {
    return getDefault(providerConfig);
  })();
}

async function getDefault(providerConfig: ProviderConfigReadonly) {
  const { Wallet } = await import("ethers");

  const noxes: Record<string, SecretsConfig> = Object.fromEntries(
    await Promise.all(
      Object.keys(providerConfig.computePeers).map(async (name) => {
        return [
          name,
          {
            networkKey: (await genSecretKeyOrReturnExisting(name)).secretKey,
            signingWallet: Wallet.createRandom().privateKey,
          },
        ] as const;
      }),
    ),
  );

  return yamlDiffPatch(
    "",
    {},
    { version: latestSchema.properties.version.const, noxes },
  );
}

export const providerSecretsSchema: JSONSchemaType<LatestConfig> = latestSchema;
