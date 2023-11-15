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

import { resolve } from "node:path";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import {
  PROVIDER_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  WEB_SOCKET_PORT_START,
  TCP_PORT_START,
  HTTP_PORT_START,
  DEFAULT_AQUAVM_POOL_SIZE,
} from "../../const.js";
import {
  type ProviderConfigArgs,
  generateUserProviderConfig,
} from "../../generateUserProviderConfig.js";
import { getFluenceDir, projectRootDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
} from "../initConfig.js";

export type Offer = {
  minPricePerWorkerEpoch: number;
  maxCollateralPerWorker: number;
  computePeers: Array<string>;
  effectors?: Array<string>;
};

export type NoxConfigYAML = {
  tcpPort?: number;
  websocketPort?: number;
  httpPort?: number;
  aquavmPoolSize?: number;
  systemServices?: {
    enable?: Array<string>;
    aquaIpfs?: {
      externalApiMultiaddr?: string;
      localApiMultiaddr?: string;
    };
    decider?: {
      deciderPeriodSec?: number;
      workerIpfsMultiaddr?: string;
      networkApiEndpoint?: string;
      networkId?: number;
      startBlock?: string;
      matcherAddress?: string;
      walletKey?: string;
    };
  };
  rawConfig?: string;
};

export const commonNoxConfig: NoxConfigYAML = {
  aquavmPoolSize: DEFAULT_AQUAVM_POOL_SIZE,
};

const noxConfigYAMLSchema = {
  type: "object",
  description:
    "Configuration to pass to the nox compute peer. Config.toml files are generated from this config",
  properties: {
    tcpPort: {
      nullable: true,
      type: "number",
      description: `Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from ${TCP_PORT_START}`,
    },
    websocketPort: {
      nullable: true,
      type: "number",
      description: `Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from ${WEB_SOCKET_PORT_START}`,
    },
    httpPort: {
      nullable: true,
      type: "number",
      description: `Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from ${HTTP_PORT_START}`,
    },
    aquavmPoolSize: {
      nullable: true,
      type: "number",
      description: `Number of aquavm instances to run. Default: ${DEFAULT_AQUAVM_POOL_SIZE}`,
    },
    systemServices: {
      nullable: true,
      type: "object",
      description:
        "System services to run by default. aquaIpfs and decider are enabled by default",
      additionalProperties: false,
      properties: {
        enable: {
          nullable: true,
          type: "array",
          items: { type: "string" },
          description: `List of system services to enable`,
        },
        aquaIpfs: {
          type: "object",
          description: "Aqua IPFS service configuration",
          additionalProperties: false,
          nullable: true,
          properties: {
            externalApiMultiaddr: {
              nullable: true,
              type: "string",
              description: `Multiaddress of external IPFS API`,
            },
            localApiMultiaddr: {
              nullable: true,
              type: "string",
              description: `Multiaddress of local IPFS API`,
            },
          },
          required: [],
        },
        decider: {
          type: "object",
          description: "Decider service configuration",
          additionalProperties: false,
          nullable: true,
          properties: {
            deciderPeriodSec: {
              nullable: true,
              type: "number",
              description: `Decider period in seconds`,
            },
            workerIpfsMultiaddr: {
              nullable: true,
              type: "string",
              description: `Multiaddress of worker IPFS node`,
            },
            networkApiEndpoint: {
              nullable: true,
              type: "string",
              description: `Network API endpoint`,
            },
            networkId: {
              nullable: true,
              type: "number",
              description: `Network ID`,
            },
            startBlock: {
              nullable: true,
              type: "string",
              description: `Start block`,
            },
            matcherAddress: {
              nullable: true,
              type: "string",
              description: `Matcher address`,
            },
            walletKey: {
              nullable: true,
              type: "string",
              description: `Wallet key`,
            },
          },
          required: [],
        },
      },
      required: [],
    },
    rawConfig: {
      nullable: true,
      type: "string",
      description: `Raw TOML config string to append to the generated config. Default: empty string`,
    },
  },
  required: [],
  nullable: true,
  additionalProperties: false,
} as const satisfies JSONSchemaType<NoxConfigYAML>;

export type ComputePeer = {
  computeUnits?: number;
  nox?: NoxConfigYAML;
};

type ConfigV0 = {
  offers: Record<string, Offer>;
  computePeers: Record<string, ComputePeer>;
  nox?: NoxConfigYAML;
  version: 0;
};

const offerSchema: JSONSchemaType<Offer> = {
  type: "object",
  description: "Defines a provider offer",
  additionalProperties: false,
  properties: {
    minPricePerWorkerEpoch: { type: "number" },
    maxCollateralPerWorker: { type: "number" },
    computePeers: {
      description: "Number of Compute Units for this Compute Peer",
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
  description: "Defines a compute peer",
  additionalProperties: false,
  properties: {
    computeUnits: { type: "number", nullable: true },
    nox: noxConfigYAMLSchema,
  },
  required: [],
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_CONFIG_FULL_FILE_NAME,
  description: `Defines config used for provider set up`,
  type: "object",
  additionalProperties: false,
  properties: {
    offers: {
      description: "A map with offer names as keys and offers as values",
      type: "object",
      additionalProperties: offerSchema,
      properties: {
        Offer: offerSchema,
      },
      required: [],
    },
    computePeers: {
      description:
        "A map with compute peer names as keys and compute peers as values",
      type: "object",
      additionalProperties: computePeerSchema,
      properties: {
        ComputePeer: computePeerSchema,
      },
      required: [],
    },
    nox: noxConfigYAMLSchema,
    version: { type: "number", const: 0 },
  },
  required: ["version", "computePeers", "offers"],
};

const getConfigOrConfigDirPath = () => {
  return projectRootDir;
};

function getDefault(args: ProviderConfigArgs) {
  return async () => {
    const { yamlDiffPatch } = await import("yaml-diff-patch");
    const userProvidedConfig = await generateUserProviderConfig(args);

    return `# Defines Provider configuration
# You can use \`fluence provider init\` command to generate this config template

# config version
version: 0

${yamlDiffPatch("", {}, userProvidedConfig)}
  `;
  };
}

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

  if (Object.keys(config.computePeers).length === 0) {
    return `There should be at least one computePeer defined in the config`;
  }

  const offers = Object.entries(config.offers);

  if (offers.length === 0) {
    return `There should be at least one offer defined in the config`;
  }

  // Checking that all computePeers referenced in offers are defined
  for (const [offerName, { computePeers }] of offers) {
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

function getInitConfigOptions(path: string | undefined) {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: PROVIDER_CONFIG_FILE_NAME,
    getConfigOrConfigDirPath: () => {
      return typeof path === "string"
        ? resolve(path)
        : getConfigOrConfigDirPath();
    },
    getSchemaDirPath: getFluenceDir,
    validate,
  };
}

export type UserProvidedConfig = Omit<LatestConfig, "version">;

export async function initNewProviderConfig({
  path,
  ...restArgs
}: ProviderConfigArgs & { path?: string | undefined } = {}) {
  return getConfigInitFunction(
    getInitConfigOptions(path),
    getDefault(restArgs),
  )();
}

export async function initNewReadonlyProviderConfig({
  path,
  ...restArgs
}: ProviderConfigArgs & { path?: string | undefined } = {}) {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(path),
    getDefault(restArgs),
  )();
}

export function initProviderConfig(path?: string | undefined) {
  return getConfigInitFunction(getInitConfigOptions(path))();
}

export function initReadonlyProviderConfig(path?: string | undefined) {
  return getReadonlyConfigInitFunction(getInitConfigOptions(path))();
}

export const providerSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
