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

import { type JsonMap, parse } from "@iarna/toml";
import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import mapKeys from "lodash-es/mapKeys.js";
import mergeWith from "lodash-es/mergeWith.js";
import snakeCase from "lodash-es/snakeCase.js";
import times from "lodash-es/times.js";

import { LOCAL_NET_WALLET_KEYS } from "../../accounts.js";
import { commandObj } from "../../commandObj.js";
import {
  COMPUTE_UNIT_MEMORY_STR,
  DEFAULT_OFFER_NAME,
  PROVIDER_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  DEFAULT_AQUAVM_POOL_SIZE,
  FS_OPTIONS,
  HTTP_PORT_START,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  CHAIN_RPC_CONTAINER_NAME,
  CHAIN_RPC_PORT,
  LOCAL_IPFS_ADDRESS,
  TOML_EXT,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
  defaultNumberProperties,
  DEAL_CONFIG,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_REWARD_DELEGATION_RATE,
  DURATION_EXAMPLE,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
  CLI_NAME,
} from "../../const.js";
import { ensureChainNetwork } from "../../ensureChainNetwork.js";
import {
  type ProviderConfigArgs,
  addOffers,
  addComputePeers,
} from "../../generateUserProviderConfig.js";
import { ensureValidContractsEnv } from "../../helpers/ensureValidContractsEnv.js";
import { getPeerIdFromSecretKey } from "../../helpers/getPeerIdFromSecretKey.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
} from "../../helpers/utils.js";
import {
  ccDurationValidator,
  validateAddress,
} from "../../helpers/validateCapacityCommitment.js";
import { validateEffectors } from "../../helpers/validations.js";
import { genSecretKeyOrReturnExisting } from "../../keyPairs.js";
import {
  ensureFluenceConfigsDir,
  getProviderConfigPath,
  getFluenceDir,
  ensureFluenceSecretsFilePath,
} from "../../paths.js";
import { type Choices, list } from "../../prompt.js";
import { envConfig, setEnvConfig } from "../globalConfigs.js";
import {
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
} from "../initConfig.js";

import { initNewEnvConfig } from "./env.js";
import { initNewProviderSecretsConfig } from "./providerSecrets.js";
import { type ProviderSecretesConfigReadonly } from "./providerSecrets.js";

export type CapacityCommitment = {
  duration: string;
  rewardDelegationRate: number;
  delegator?: string;
};

const capacityCommitmentSchema = {
  type: "object",
  description: "Defines a capacity commitment",
  required: ["duration", "rewardDelegationRate"],
  additionalProperties: false,
  properties: {
    duration: {
      type: "string",
      default: DEFAULT_CC_DURATION,
      description: `Duration of the commitment ${DURATION_EXAMPLE}`,
    },
    delegator: {
      type: "string",
      description: "Delegator address",
      nullable: true,
    },
    rewardDelegationRate: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Reward delegation rate in percent",
      default: DEFAULT_CC_REWARD_DELEGATION_RATE,
    },
  },
} as const satisfies JSONSchemaType<CapacityCommitment>;

export type Offer = {
  minPricePerWorkerEpoch: number;
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
      description: `Raw TOML config string to parse and merge with the rest of the config. Has the highest priority`,
    },
  },
  required: [],
  nullable: true,
  additionalProperties: false,
} as const satisfies JSONSchemaType<NoxConfigYAML>;

type ComputePeer = {
  computeUnits: number;
  nox?: NoxConfigYAML;
};

type ConfigV0 = {
  providerName: string;
  offers: Record<string, Offer>;
  computePeers: Record<string, ComputePeer>;
  capacityCommitments?: Record<string, CapacityCommitment>;
  nox?: NoxConfigYAML;
  version: 0;
};

const offerSchema = {
  type: "object",
  description: "Defines a provider offer",
  additionalProperties: false,
  properties: {
    minPricePerWorkerEpoch: {
      type: "number",
      description: `Minimum price per worker epoch in FLT`,
    },
    computePeers: {
      description: "Number of Compute Units for this Compute Peer",
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
    },
    effectors: { type: "array", items: { type: "string" }, nullable: true },
  },
  required: ["minPricePerWorkerEpoch", "computePeers"],
} as const satisfies JSONSchemaType<Offer>;

const computePeerSchema = {
  type: "object",
  description: "Defines a compute peer",
  additionalProperties: false,
  properties: {
    computeUnits: {
      type: "number",
      description: `How many compute units should nox have. Default: ${DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX} (each compute unit requires ${COMPUTE_UNIT_MEMORY_STR} of RAM)`,
    },
    nox: noxConfigYAMLSchema,
  },
  required: ["computeUnits"],
} as const satisfies JSONSchemaType<ComputePeer>;

const configSchemaV0 = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_CONFIG_FULL_FILE_NAME,
  description: `Defines config used for provider set up`,
  type: "object",
  additionalProperties: false,
  properties: {
    providerName: {
      description: "Provider name",
      type: "string",
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
    capacityCommitments: {
      description:
        "A map with nox names as keys and capacity commitments as values",
      type: "object",
      additionalProperties: capacityCommitmentSchema,
      properties: {
        noxName: capacityCommitmentSchema,
      },
      required: [],
      nullable: true,
    },
    version: { type: "number", const: 0, description: "Config version" },
  },
  required: ["version", "computePeers", "offers", "providerName"],
} as const satisfies JSONSchemaType<ConfigV0>;

const DEFAULT_NUMBER_OF_LOCAL_NET_NOXES = 3;

function getDefault(args: Omit<ProviderConfigArgs, "name">) {
  return async () => {
    commandObj.logToStderr("Creating new provider config\n");
    const { yamlDiffPatch } = await import("yaml-diff-patch");

    const env = await ensureChainNetwork(args.env);

    setEnvConfig(await initNewEnvConfig(await ensureValidContractsEnv(env)));

    const userProvidedConfig: UserProvidedConfig = {
      providerName: "defaultProvider",
      computePeers: {},
      offers: {},
    };

    if (envConfig?.fluenceEnv === "local") {
      userProvidedConfig.computePeers = Object.fromEntries(
        times(args.noxes ?? DEFAULT_NUMBER_OF_LOCAL_NET_NOXES).map((i) => {
          return [
            `nox-${i}`,
            { computeUnits: DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX },
          ] as const;
        }),
      );

      userProvidedConfig.capacityCommitments = Object.fromEntries(
        Object.keys(userProvidedConfig.computePeers).map((noxName) => {
          return [
            noxName,
            {
              duration: DEFAULT_CC_DURATION,
              rewardDelegationRate: DEFAULT_CC_REWARD_DELEGATION_RATE,
            },
          ] as const;
        }),
      );

      userProvidedConfig.offers = {
        [DEFAULT_OFFER_NAME]: {
          ...defaultNumberProperties,
          computePeers: Object.keys(userProvidedConfig.computePeers),
        },
      };
    } else {
      await addComputePeers(args.noxes, userProvidedConfig);
      await addOffers(userProvidedConfig);
    }

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

const getValidate: (
  args: ProviderConfigArgs,
) => ConfigValidateFunction<LatestConfig> = (args) => {
  return async (config) => {
    const invalid: Array<{
      offerName: string;
      missingComputePeerNames: Array<string>;
    }> = [];

    if (isEmpty(config.computePeers)) {
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

    const env = await ensureChainNetwork(args.env);
    const validateCCDuration = await ccDurationValidator(env === "local");

    const capacityCommitmentErrors = (
      await Promise.all(
        Object.entries(config.capacityCommitments ?? {}).map(
          async ([name, cc]) => {
            const errors = [
              cc.delegator === undefined
                ? true
                : await validateAddress(cc.delegator),
              validateCCDuration(cc.duration),
            ].filter((e) => {
              return e !== true;
            });

            return errors.length === 0
              ? true
              : `Invalid capacity commitment for ${color.yellow(
                  name,
                )}:\n${errors.join("\n")}`;
          },
        ),
      )
    ).filter((e) => {
      return e !== true;
    });

    if (capacityCommitmentErrors.length > 0) {
      return capacityCommitmentErrors.join("\n\n");
    }

    return validateEffectors(
      Object.entries(config.offers).flatMap(([name, { effectors }]) => {
        return (effectors ?? []).map((effector) => {
          return {
            effector,
            location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > offers > ${name} > effectors > ${effector}`,
          };
        });
      }),
    );
  };
};

function getInitConfigOptions(args: ProviderConfigArgs) {
  return {
    allSchemas: [configSchemaV0],
    latestSchema: configSchemaV0,
    migrations,
    name: PROVIDER_CONFIG_FILE_NAME,
    getConfigOrConfigDirPath: () => {
      return getProviderConfigPath();
    },
    getSchemaDirPath: getFluenceDir,
    validate: getValidate(args),
  };
}

export type UserProvidedConfig = Omit<LatestConfig, "version">;

export async function initNewReadonlyProviderConfig(args: ProviderConfigArgs) {
  return getReadonlyConfigInitFunction(
    getInitConfigOptions(args),
    getDefault(args),
  )();
}

export function initReadonlyProviderConfig(args: ProviderConfigArgs) {
  return getReadonlyConfigInitFunction(getInitConfigOptions(args))();
}

export async function ensureReadonlyProviderConfig(args: ProviderConfigArgs) {
  const providerConfig = await getReadonlyConfigInitFunction(
    getInitConfigOptions(args),
  )();

  if (providerConfig === null) {
    commandObj.error(
      `You need to run ${color.yellow(
        `${CLI_NAME} provider init`,
      )} first to create a provider config`,
    );
  }

  return initNewReadonlyProviderConfig(args);
}

export const providerSchema: JSONSchemaType<LatestConfig> = configSchemaV0;

export async function ensureConfigToml(
  providerConfig: ProviderConfigReadonly,
  providerSecretsConfig?: ProviderSecretesConfigReadonly | null,
) {
  const { rawConfig: providerRawNoxConfig, ...providerNoxConfig } =
    providerConfig.nox ?? {};

  const baseNoxConfig = mergeNoxConfigYAML(
    await getDefaultNoxConfigYAML(),
    providerNoxConfig,
  );

  const configsDir = await ensureFluenceConfigsDir();
  const { stringify } = await import("@iarna/toml");

  const computePeers = Object.entries(providerConfig.computePeers);

  const parsedProviderRawConfig =
    providerRawNoxConfig === undefined
      ? undefined
      : parse(providerRawNoxConfig);

  await Promise.all(
    computePeers.map(async ([computePeerName, computePeerConfig], i) => {
      const { rawConfig: computePeerRawNoxConfig, ...computePeerNoxConfig } =
        computePeerConfig.nox ?? {};

      let overriddenNoxConfig = mergeNoxConfigYAML(
        baseNoxConfig,
        computePeerNoxConfig,
      );

      if (overriddenNoxConfig.tcpPort === undefined) {
        overriddenNoxConfig.tcpPort = TCP_PORT_START + i;
      }

      if (overriddenNoxConfig.websocketPort === undefined) {
        overriddenNoxConfig.websocketPort = WEB_SOCKET_PORT_START + i;
      }

      if (overriddenNoxConfig.httpPort === undefined) {
        overriddenNoxConfig.httpPort = HTTP_PORT_START + i;
      }

      if (
        overriddenNoxConfig.systemServices?.decider?.walletKey === undefined
      ) {
        const walletKey =
          providerSecretsConfig?.noxes[computePeerName]?.signingWallet ??
          LOCAL_NET_WALLET_KEYS[i % LOCAL_NET_WALLET_KEYS.length];

        assert(walletKey !== undefined, "Unreachable");

        overriddenNoxConfig.systemServices = {
          ...overriddenNoxConfig.systemServices,
          decider: {
            ...overriddenNoxConfig.systemServices?.decider,
            walletKey,
          },
        };
      }

      if (parsedProviderRawConfig !== undefined) {
        overriddenNoxConfig = mergeNoxConfigYAML(
          overriddenNoxConfig,
          parsedProviderRawConfig,
        );
      }

      const parsedComputePeerRawConfig =
        computePeerRawNoxConfig === undefined
          ? undefined
          : parse(computePeerRawNoxConfig);

      if (parsedComputePeerRawConfig !== undefined) {
        overriddenNoxConfig = mergeNoxConfigYAML(
          overriddenNoxConfig,
          parsedComputePeerRawConfig,
        );
      }

      return writeFile(
        join(configsDir, getConfigTomlName(computePeerName)),
        stringify(configYAMLToConfigToml(overriddenNoxConfig)),
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

async function getDefaultNoxConfigYAML(): Promise<NoxConfigYAML> {
  const isLocal = envConfig?.fluenceEnv === "local";
  const env = await ensureValidContractsEnv(envConfig?.fluenceEnv);
  const dealConfig = DEAL_CONFIG[env];

  return mergeNoxConfigYAML(commonNoxConfig, {
    systemServices: {
      enable: ["aqua-ipfs", "decider"],
      aquaIpfs: {
        externalApiMultiaddr: isLocal
          ? LOCAL_IPFS_ADDRESS
          : `/dns4/${env}-ipfs.fluence.dev/tcp/5020`,
        localApiMultiaddr: isLocal
          ? NOX_IPFS_MULTIADDR
          : `/dns4/${env}-ipfs.fluence.dev/tcp/5020`,
      },
      decider: {
        deciderPeriodSec: 10,
        workerIpfsMultiaddr: isLocal
          ? NOX_IPFS_MULTIADDR
          : "http://ipfs.fluence.dev",
        networkApiEndpoint: isLocal
          ? `http://${CHAIN_RPC_CONTAINER_NAME}:${CHAIN_RPC_PORT}`
          : "http://mumbai-polygon.ru:8545",
        networkId: dealConfig.id,
        startBlock: "earliest",
        // TODO: use correct addr for env
        matcherAddress: "0xc5a5C42992dECbae36851359345FE25997F5C42d",
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

export function promptForOffer(offers: ProviderConfigReadonly["offers"]) {
  const options: Choices<Offer> = Object.entries(offers).map(
    ([name, offer]) => {
      return {
        name,
        value: offer,
      };
    },
  );

  return list({
    message: "Select offer",
    options,
    oneChoiceMessage(choice) {
      return `Select offer ${color.yellow(choice)}`;
    },
    onNoChoices() {
      commandObj.error("No offers found");
    },
  });
}

export type EnsureComputerPeerConfigs = Awaited<
  ReturnType<typeof ensureComputerPeerConfigs>
>[number];

export async function ensureComputerPeerConfigs(args: ProviderConfigArgs) {
  const { ethers } = await import("ethers");
  const providerConfig = await initNewReadonlyProviderConfig(args);

  const { rawConfig: providerRawNoxConfig, ...providerNoxConfig } =
    providerConfig.nox ?? {};

  const baseNoxConfig = mergeNoxConfigYAML(
    await getDefaultNoxConfigYAML(),
    providerNoxConfig,
  );

  const parsedProviderRawConfig =
    providerRawNoxConfig === undefined
      ? undefined
      : parse(providerRawNoxConfig);

  const providerSecretsConfig =
    await initNewProviderSecretsConfig(providerConfig);

  const [computePeersWithoutKeys, computePeersWithKeys] = splitErrorsAndResults(
    Object.entries(providerConfig.computePeers).map(
      ([computePeerName, computePeer]) => {
        return {
          computePeerName,
          computePeer,
          secretKey: providerSecretsConfig.noxes[computePeerName]?.networkKey,
          signingWallet:
            providerSecretsConfig.noxes[computePeerName]?.signingWallet,
        };
      },
    ),
    ({ secretKey, signingWallet, computePeerName, computePeer }) => {
      if (secretKey === undefined || signingWallet === undefined) {
        return {
          error: { computePeerName, computePeer },
        };
      }

      return {
        result: { secretKey, signingWallet, computePeerName, computePeer },
      };
    },
  );

  if (computePeersWithoutKeys.length > 0) {
    commandObj.warn(
      `Missing keys for the following compute peers in noxes property at ${providerSecretsConfig.$getPath()}:\n${computePeersWithoutKeys
        .map(({ computePeerName }) => {
          return computePeerName;
        })
        .join(", ")}\nGenerating new ones...`,
    );

    const computePeersWithGeneratedKeys = await Promise.all(
      computePeersWithoutKeys.map(async ({ computePeer, computePeerName }) => {
        return {
          secretKey: (await genSecretKeyOrReturnExisting(computePeerName))
            .secretKey,
          computePeerName,
          computePeer,
          signingWallet: ethers.Wallet.createRandom().privateKey,
        };
      }),
    );

    providerSecretsConfig.noxes = {
      ...providerSecretsConfig.noxes,
      ...Object.fromEntries(
        computePeersWithGeneratedKeys.map(
          ({ computePeerName, secretKey, signingWallet }) => {
            return [
              computePeerName,
              { networkKey: secretKey, signingWallet },
            ] as const;
          },
        ),
      ),
    };

    await providerSecretsConfig.$commit();
    computePeersWithKeys.push(...computePeersWithGeneratedKeys);
  }

  const [noCCError, computePeersWithCC] = splitErrorsAndResults(
    computePeersWithKeys,
    (c) => {
      const capacityCommitment =
        providerConfig.capacityCommitments?.[c.computePeerName];

      if (capacityCommitment === undefined) {
        return {
          error: c.computePeerName,
        };
      }

      return { result: { ...c, capacityCommitment } };
    },
  );

  if (noCCError.length > 0) {
    commandObj.error(
      `Missing capacity commitment for compute peers at ${providerConfig.$getPath()}:\n\nd${noCCError
        .map((n) => {
          return `capacityCommitments.${n}`;
        })
        .join("\n")}`,
    );
  }

  const { stringify } = await import("@iarna/toml");
  const configsDir = await ensureFluenceConfigsDir();

  return Promise.all(
    computePeersWithCC.map(
      async (
        {
          computePeerName,
          computePeer,
          secretKey,
          signingWallet,
          capacityCommitment,
        },
        i,
      ) => {
        const { rawConfig: computePeerRawNoxConfig, ...computePeerNoxConfig } =
          computePeer.nox ?? {};

        let overriddenNoxConfig = mergeNoxConfigYAML(
          baseNoxConfig,
          computePeerNoxConfig,
        );

        if (overriddenNoxConfig.tcpPort === undefined) {
          overriddenNoxConfig.tcpPort = TCP_PORT_START + i;
        }

        if (overriddenNoxConfig.websocketPort === undefined) {
          overriddenNoxConfig.websocketPort = WEB_SOCKET_PORT_START + i;
        }

        if (overriddenNoxConfig.httpPort === undefined) {
          overriddenNoxConfig.httpPort = HTTP_PORT_START + i;
        }

        if (
          overriddenNoxConfig.systemServices?.decider?.walletKey === undefined
        ) {
          overriddenNoxConfig.systemServices = {
            ...overriddenNoxConfig.systemServices,
            decider: {
              ...overriddenNoxConfig.systemServices?.decider,
              walletKey: signingWallet,
            },
          };
        }

        if (parsedProviderRawConfig !== undefined) {
          overriddenNoxConfig = mergeNoxConfigYAML(
            overriddenNoxConfig,
            parsedProviderRawConfig,
          );
        }

        const parsedComputePeerRawConfig =
          computePeerRawNoxConfig === undefined
            ? undefined
            : parse(computePeerRawNoxConfig);

        if (parsedComputePeerRawConfig !== undefined) {
          overriddenNoxConfig = mergeNoxConfigYAML(
            overriddenNoxConfig,
            parsedComputePeerRawConfig,
          );
        }

        await writeFile(
          await ensureFluenceSecretsFilePath(computePeerName),
          secretKey,
          FS_OPTIONS,
        );

        await writeFile(
          join(configsDir, getConfigTomlName(computePeerName)),
          stringify(configYAMLToConfigToml(overriddenNoxConfig)),
          FS_OPTIONS,
        );

        return {
          name: computePeerName,
          overriddenNoxConfig,
          secretKey,
          peerId: await getPeerIdFromSecretKey(secretKey),
          computeUnits: computePeer.computeUnits,
          walletKey: signingWallet,
          walletAddress: await new ethers.Wallet(signingWallet).getAddress(),
          capacityCommitment,
        };
      },
    ),
  );
}

export async function resolveComputePeersByNames(
  args: ProviderConfigArgs & {
    "nox-names"?: string | undefined;
  },
) {
  const computePeers = await ensureComputerPeerConfigs(args);

  if (args["nox-names"] === undefined) {
    return computePeers;
  }

  const noxNames = commaSepStrToArr(args["nox-names"]);

  const [unknownNoxNames, validNoxNames] = splitErrorsAndResults(
    noxNames,
    (name) => {
      if (
        computePeers.find((cp) => {
          return cp.name === name;
        }) !== undefined
      ) {
        return { result: name };
      }

      return { error: name };
    },
  );

  if (unknownNoxNames.length > 0) {
    const providerConfig = await initNewReadonlyProviderConfig(args);

    commandObj.error(
      `nox names: ${color.yellow(
        unknownNoxNames.join(", "),
      )} not found in ${color.yellow(
        "computePeers",
      )} property of ${providerConfig.$getPath()}`,
    );
  }

  return computePeers.filter(({ name }) => {
    return validNoxNames.includes(name);
  });
}
