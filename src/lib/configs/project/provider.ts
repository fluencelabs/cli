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

import assert from "assert";
import { writeFile } from "fs/promises";
import { join } from "path";

import type { JsonMap } from "@iarna/toml";
import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import cloneDeep from "lodash-es/cloneDeep.js";
import mapKeys from "lodash-es/mapKeys.js";
import mergeWith from "lodash-es/mergeWith.js";
import snakeCase from "lodash-es/snakeCase.js";

import { commandObj } from "../../commandObj.js";
import {
  type ContractsENV,
  PROVIDER_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  DEFAULT_AQUAVM_POOL_SIZE,
  CONTRACTS_ENV,
  FS_OPTIONS,
  HTTP_PORT_START,
  TCP_PORT_START,
  WALLET_KEYS_FOR_LOCAL_NETWORK,
  WEB_SOCKET_PORT_START,
  CHAIN_CONTAINER_NAME,
  CHAIN_PORT,
  LOCAL_IPFS_ADDRESS,
  TOML_EXT,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
} from "../../const.js";
import {
  type ProviderConfigArgs,
  addComputePeers,
  addOffers,
} from "../../generateUserProviderConfig.js";
import { ensureValidContractsEnv } from "../../helpers/ensureValidContractsEnv.js";
import { getSecretKeyOrReturnExisting } from "../../keyPairs.js";
import {
  ensureFluenceConfigsDir,
  ensureProviderConfigPath,
  getFluenceDir,
  setProviderConfigName,
} from "../../paths.js";
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

type NoxConfigYAML = {
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

const commonNoxConfig: NoxConfigYAML = {
  aquavmPoolSize: DEFAULT_AQUAVM_POOL_SIZE,
};

const NOX_IPFS_MULTIADDR = `/dns4/${IPFS_CONTAINER_NAME}/tcp/${IPFS_PORT}`;

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

type ComputePeer = {
  computeUnits?: number;
  nox?: NoxConfigYAML;
};

type ConfigV0 = {
  env: ContractsENV;
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
    minPricePerWorkerEpoch: {
      type: "number",
      description: "Minimum price per worker epoch",
    },
    maxCollateralPerWorker: {
      type: "number",
      description: "Max collateral per worker",
    },
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
    env: {
      description:
        "Defines the the environment for which you intend to generate nox configuration",
      type: "string",
      enum: CONTRACTS_ENV,
    },
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
  required: ["version", "computePeers", "offers", "env"],
};

const getConfigOrConfigDirPath = () => {
  return ensureProviderConfigPath();
};

function getDefault(args: Omit<ProviderConfigArgs, "name">) {
  return async () => {
    commandObj.logToStderr("Creating new provider config\n");
    const { yamlDiffPatch } = await import("yaml-diff-patch");

    const userProvidedConfig: UserProvidedConfig = {
      env: await ensureValidContractsEnv(args.env),
      computePeers: {},
      offers: {},
    };

    await addComputePeers(args.noxes, userProvidedConfig);
    await addOffers(args, userProvidedConfig);

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

function getInitConfigOptions() {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: PROVIDER_CONFIG_FILE_NAME,
    getConfigOrConfigDirPath: () => {
      return getConfigOrConfigDirPath();
    },
    getSchemaDirPath: getFluenceDir,
    validate,
  };
}

export type UserProvidedConfig = Omit<LatestConfig, "version">;

async function ensureSecrets(providerConfig: ProviderConfigReadonly) {
  return Promise.all(
    Object.keys(providerConfig.computePeers).map(async (name) => {
      return getSecretKeyOrReturnExisting(name);
    }),
  );
}

export async function initNewProviderConfig({
  name,
  ...args
}: ProviderConfigArgs) {
  if (name !== undefined) {
    setProviderConfigName(name);
  }

  const providerConfig = await getConfigInitFunction(
    getInitConfigOptions(),
    getDefault(args),
  )();

  await ensureSecrets(providerConfig);
  await ensureConfigToml(providerConfig);
  return providerConfig;
}

export async function initNewReadonlyProviderConfig({
  name,
  ...args
}: ProviderConfigArgs) {
  if (name !== undefined) {
    setProviderConfigName(name);
  }

  const providerConfig = await getReadonlyConfigInitFunction(
    getInitConfigOptions(),
    getDefault(args),
  )();

  await ensureSecrets(providerConfig);
  await ensureConfigToml(providerConfig);
  return providerConfig;
}

export function initProviderConfig(name?: string | undefined) {
  if (name !== undefined) {
    setProviderConfigName(name);
  }

  return getConfigInitFunction(getInitConfigOptions())();
}

export function initReadonlyProviderConfig(name?: string | undefined) {
  if (name !== undefined) {
    setProviderConfigName(name);
  }

  return getReadonlyConfigInitFunction(getInitConfigOptions())();
}

export const providerSchema: JSONSchemaType<LatestConfig> = configSchemaV0;

export async function ensureConfigToml(providerConfig: ProviderConfigReadonly) {
  const baseNoxConfig = mergeNoxConfigYAML(
    await getDefaultNoxConfigYAML(providerConfig),
    providerConfig.nox ?? {},
  );

  const configsDir = await ensureFluenceConfigsDir();
  const { stringify } = await import("@iarna/toml");

  await Promise.all(
    Object.entries(providerConfig.computePeers).map(async ([key, value], i) => {
      const overridden = mergeNoxConfigYAML(baseNoxConfig, value.nox ?? {});

      if (overridden.tcpPort === undefined) {
        overridden.tcpPort = TCP_PORT_START + i;
      }

      if (overridden.websocketPort === undefined) {
        overridden.websocketPort = WEB_SOCKET_PORT_START + i;
      }

      if (overridden.httpPort === undefined) {
        overridden.httpPort = HTTP_PORT_START + i;
      }

      if (overridden.systemServices?.decider?.walletKey === undefined) {
        const walletKey =
          WALLET_KEYS_FOR_LOCAL_NETWORK[
            i % WALLET_KEYS_FOR_LOCAL_NETWORK.length
          ];

        assert(walletKey !== undefined, "Unreachable");

        overridden.systemServices = {
          ...overridden.systemServices,
          decider: {
            ...overridden.systemServices?.decider,
            walletKey,
          },
        };
      }

      return writeFile(
        join(configsDir, getConfigTomlName(key)),
        [
          stringify(configYAMLToConfigToml(overridden)),
          providerConfig.nox?.rawConfig,
          value.nox?.rawConfig,
        ]
          .filter(Boolean)
          .join("\n"),
        FS_OPTIONS,
      );
    }),
  );
}

function mergeNoxConfigYAML(a: NoxConfigYAML, b: NoxConfigYAML) {
  return mergeWith(cloneDeep(a), b, (objValue, srcValue) => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return srcValue;
    }

    return undefined;
  });
}

function configYAMLToConfigToml(config: NoxConfigYAML) {
  // Would be too hard to properly type this
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return camelCaseKeysToSnakeCase(config) as JsonMap;
}

function camelCaseKeysToSnakeCase(val: unknown): unknown {
  if (typeof val === "object" && val !== null) {
    if (Array.isArray(val)) {
      return val.map(camelCaseKeysToSnakeCase);
    }

    const objWithSnakeCaseKeys = mapKeys(val, (_, key) => {
      return snakeCase(key);
    });

    return Object.fromEntries(
      Object.entries(objWithSnakeCaseKeys).map(([key, value]) => {
        return [key, camelCaseKeysToSnakeCase(value)];
      }),
    );
  }

  return val;
}

async function getDefaultNoxConfigYAML(
  providerConfig: ProviderConfigReadonly,
): Promise<NoxConfigYAML> {
  const isLocal = providerConfig.env === "local";
  const contractsEnv = providerConfig.env;

  const { DEAL_CONFIG } = await import(
    "@fluencelabs/deal-aurora/dist/client/config.js"
  );

  const dealConfig = await DEAL_CONFIG[contractsEnv]();

  return mergeNoxConfigYAML(commonNoxConfig, {
    systemServices: {
      enable: ["aqua-ipfs", "decider"],
      aquaIpfs: {
        externalApiMultiaddr: isLocal
          ? LOCAL_IPFS_ADDRESS
          : `/dns4/${contractsEnv}-ipfs.fluence.dev/tcp/5020`,
        localApiMultiaddr: isLocal
          ? NOX_IPFS_MULTIADDR
          : `/dns4/${contractsEnv}-ipfs.fluence.dev/tcp/5020`,
      },
      decider: {
        deciderPeriodSec: 10,
        workerIpfsMultiaddr: isLocal
          ? NOX_IPFS_MULTIADDR
          : "http://ipfs.fluence.dev",
        networkApiEndpoint: isLocal
          ? `http://${CHAIN_CONTAINER_NAME}:${CHAIN_PORT}`
          : "http://mumbai-polygon.ru:8545",
        networkId: dealConfig.chainId,
        startBlock: "earliest",
        // TODO: use correct addr for env
        matcherAddress: "0x0e1F3B362E22B2Dc82C9E35d6e62998C7E8e2349",
      },
    },
  });
}

function getConfigName(noxName: string) {
  return `${noxName}_Config`;
}

export function getConfigTomlName(noxName: string) {
  return `${getConfigName(noxName)}.${TOML_EXT}`;
}
