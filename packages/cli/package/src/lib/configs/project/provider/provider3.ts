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

import { parse } from "@iarna/toml";
import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import mapValues from "lodash-es/mapValues.js";
import mergeWith from "lodash-es/mergeWith.js";

import {
  jsonStringify,
  CHAIN_RPC_PORT,
  type ChainENV,
} from "../../../../common.js";
import { versions } from "../../../../versions.js";
import { getChainId } from "../../../chain/chainConfig.js";
import {
  ccDurationValidator,
  validateAddress,
  validateProtocolVersion,
} from "../../../chain/chainValidators.js";
import {
  PROVIDER_CONFIG_FULL_FILE_NAME,
  DEFAULT_AQUAVM_POOL_SIZE,
  HTTP_PORT_START,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  LOCAL_IPFS_ADDRESS,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_STAKER_REWARD,
  DURATION_EXAMPLE,
  WS_CHAIN_URLS,
  CHAIN_RPC_CONTAINER_NAME,
  DEFAULT_VM_EFFECTOR_CID,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
} from "../../../const.js";
import { resolveDeployment } from "../../../dealClient.js";
import { ensureChainEnv } from "../../../ensureChainNetwork.js";
import {
  type ValidationResult,
  validateCIDs,
} from "../../../helpers/validations.js";
import { validateBatchAsync } from "../../../helpers/validations.js";
import { resolveRelaysWithoutLocal } from "../../../multiaddresWithoutLocal.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";
import { initEnvConfig } from "../env/env.js";

import { providerNameSchema } from "./provider0.js";
import {
  ccpConfigYAMLSchema,
  computePeersSchema,
  DEFAULT_IPFS_BINARY_PATH,
  DEFAULT_PROOF_POLL_PERIOD,
  DEFAULT_TIMER_RESOLUTION,
  noxConfigYAMLSchema,
  type CCPConfigYAML,
  type ComputePeers,
  type NoxConfigYAML,
} from "./provider1.js";
import {
  offersSchema,
  type Offers,
  type Config as PrevConfig,
} from "./provider2.js";

type CapacityCommitment = {
  duration: string;
  stakerReward: number;
  delegator?: string;
};

const capacityCommitmentSchema = {
  type: "object",
  description: "Defines a capacity commitment",
  required: ["duration", "stakerReward"],
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
    stakerReward: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Staker reward in percent",
      default: DEFAULT_CC_STAKER_REWARD,
    },
  },
} as const satisfies JSONSchemaType<CapacityCommitment>;

type CapacityCommitments = Record<string, CapacityCommitment>;

const capacityCommitmentsSchema = {
  type: "object",
  description:
    "A map with nox names as keys and capacity commitments as values",
  additionalProperties: capacityCommitmentSchema,
  properties: {
    noxName: capacityCommitmentSchema,
  },
  required: [],
} as const satisfies JSONSchemaType<CapacityCommitments>;

export type Config = {
  providerName: string;
  capacityCommitments: CapacityCommitments;
  nox?: NoxConfigYAML;
  computePeers: ComputePeers;
  ccp?: CCPConfigYAML;
  offers: Offers;
};

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      providerName: providerNameSchema,
      computePeers: computePeersSchema,
      nox: noxConfigYAMLSchema,
      ccp: ccpConfigYAMLSchema,
      capacityCommitments: capacityCommitmentsSchema,
      offers: offersSchema,
    },
    required: ["computePeers", "offers", "providerName", "capacityCommitments"],
  },
  migrate(config) {
    return {
      ...config,
      capacityCommitments: mapValues(
        config.capacityCommitments,
        ({ rewardDelegationRate: stakerReward, ...cc }) => {
          return { ...cc, stakerReward };
        },
      ),
    };
  },
  validate(config) {
    return validateBatchAsync(
      validateCIDs(
        Object.entries(config.offers).flatMap(([name, { effectors }]) => {
          return (effectors ?? []).map((cid) => {
            return {
              cid,
              location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > offers > ${name} > effectors`,
            };
          });
        }),
      ),
      validateCIDs(
        Object.entries(config.nox?.effectors ?? {}).map(
          ([effectorName, { wasmCID: cid }]) => {
            return {
              cid,
              location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > nox > effectors > ${effectorName} > wasmCID`,
            };
          },
        ),
      ),
      validateCIDs(
        Object.entries(config.computePeers).flatMap(
          ([computePeerName, { nox }]) => {
            return Object.entries(nox?.effectors ?? {}).map(
              ([effectorName, { wasmCID: cid }]) => {
                return {
                  cid,
                  location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > computePeers > ${computePeerName} > nox > effectors > ${effectorName} > wasmCID`,
                };
              },
            );
          },
        ),
      ),
      validateEffectors(config),
      validateCC(config),
      validateMissingComputePeers(config),
      validateNoDuplicateNoxNamesInOffers(config),
      validateProtocolVersions(config),
    );
  },
} satisfies ConfigOptions<PrevConfig, Config>;

async function validateProtocolVersions(providerConfig: Config) {
  const errors = (
    await Promise.all(
      Object.entries(providerConfig.offers).flatMap(
        ([
          offer,
          {
            maxProtocolVersion = versions.protocolVersion,
            minProtocolVersion = versions.protocolVersion,
          },
        ]) => {
          return [
            Promise.resolve({
              offer,
              property: "minProtocolVersion or maxProtocolVersion",
              validity:
                minProtocolVersion > maxProtocolVersion
                  ? `minProtocolVersion must be less than or equal to maxProtocolVersion. Got: minProtocolVersion=${color.yellow(
                      minProtocolVersion,
                    )} maxProtocolVersion=${color.yellow(maxProtocolVersion)}`
                  : true,
            }),
            ...(
              [
                ["minProtocolVersion", minProtocolVersion],
                ["maxProtocolVersion", maxProtocolVersion],
              ] as const
            ).map(async ([property, v]) => {
              return {
                offer,
                property,
                validity: await validateProtocolVersion(v),
              };
            }),
          ];
        },
      ),
    )
  ).filter((a): a is typeof a & { validity: string } => {
    return a.validity !== true;
  });

  if (errors.length > 0) {
    return errors
      .map(({ offer, property, validity }) => {
        return `Offer ${color.yellow(offer)} has invalid ${color.yellow(
          property,
        )} property: ${validity}`;
      })
      .join("\n");
  }

  return true;
}

export async function validateEffectors(
  providerConfig: Config,
): Promise<ValidationResult> {
  const errors = (
    await Promise.all(
      Object.entries(providerConfig.offers).flatMap(
        ([offerName, { effectors = [], computePeers: computePeerNames }]) => {
          const offerEffectorsString = jsonStringify([...effectors].sort());

          return computePeerNames.map(async (computePeerName) => {
            const computePeer = providerConfig.computePeers[computePeerName];

            if (computePeer === undefined) {
              return true;
            }

            const noxConfig = await resolveNoxConfigYAML(
              providerConfig.nox,
              computePeer.nox,
            );

            const computePeerEffectors = [
              ...Object.values(noxConfig.effectors ?? {}).map(({ wasmCID }) => {
                return wasmCID;
              }),
            ].sort();

            const hasDefaultVmEffector = computePeerEffectors.includes(
              DEFAULT_VM_EFFECTOR_CID,
            );

            if (
              noxConfig.vm?.network.publicIp !== undefined &&
              !hasDefaultVmEffector
            ) {
              return `Compute peer ${color.yellow(
                computePeerName,
              )} has a defined publicIp property:\n\nvm:\n  network:\n    publicIp: ${noxConfig.vm.network.publicIp}\n\nso it is expected to also have a vm effector:\n\neffectors:\n  vm:\n    wasmCID: ${DEFAULT_VM_EFFECTOR_CID}`;
            }

            if (
              noxConfig.vm?.network.publicIp === undefined &&
              hasDefaultVmEffector
            ) {
              return `Compute peer ${color.yellow(
                computePeerName,
              )} has a vm effector:\n\neffectors:\n  vm:\n    wasmCID: ${DEFAULT_VM_EFFECTOR_CID}\n\nso it is expected to also have a defined publicIp property:\n\nvm:\n  network:\n    publicIp: <public_ip>`;
            }

            const computePeerEffectorsString =
              jsonStringify(computePeerEffectors);

            if (computePeerEffectorsString !== offerEffectorsString) {
              return `Offer ${color.yellow(
                offerName,
              )} contains computePeer ${color.yellow(
                computePeerName,
              )}, that has effectors ${color.yellow(
                computePeerEffectorsString,
              )} which doesn't match effectors that are specified in the offer ${color.yellow(
                offerEffectorsString,
              )}`;
            }

            return true;
          });
        },
      ),
    )
  ).filter((result): result is string => {
    return typeof result === "string";
  });

  return errors.length > 0 ? errors.join("\n\n") : true;
}

function validateNoDuplicateNoxNamesInOffers(config: Config): ValidationResult {
  const noxNamesInOffers: Record<string, string[]> = {};

  Object.entries(config.offers).forEach(([offerName, { computePeers }]) => {
    computePeers.forEach((noxName) => {
      const arr = noxNamesInOffers[noxName];

      if (arr === undefined) {
        noxNamesInOffers[noxName] = [offerName];
      } else {
        arr.push(offerName);
      }
    });
  });

  const duplicateNoxNames = Object.entries(noxNamesInOffers).filter(
    ([, offerNames]) => {
      return offerNames.length > 1;
    },
  );

  if (duplicateNoxNames.length > 0) {
    return duplicateNoxNames
      .map(([noxName, offerNames]) => {
        return `Nox ${color.yellow(
          noxName,
        )} is present in multiple offers: ${color.yellow(
          offerNames.join(", "),
        )}`;
      })
      .join("\n");
  }

  return true;
}

async function validateCC(config: Config): Promise<ValidationResult> {
  const validateCCDuration = await ccDurationValidator();

  const capacityCommitmentErrors = (
    await Promise.all(
      Object.entries(config.capacityCommitments).map(async ([name, cc]) => {
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
      }),
    )
  ).filter((e) => {
    return e !== true;
  });

  if (capacityCommitmentErrors.length > 0) {
    return capacityCommitmentErrors.join("\n\n");
  }

  return true;
}

function validateMissingComputePeers(config: Config): ValidationResult {
  const missingComputePeerNamesInOffer: Array<{
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
      missingComputePeerNamesInOffer.push({
        offerName,
        missingComputePeerNames,
      });
    }
  }

  if (missingComputePeerNamesInOffer.length > 0) {
    return missingComputePeerNamesInOffer
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
}

function mergeConfigYAML<T>(a: T, b: Record<string, unknown>) {
  return mergeWith(cloneDeep(a), b, (objValue, srcValue) => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return srcValue;
    }

    return undefined;
  });
}

export function mergeConfigYAMLWithRawConfig<
  T extends { rawConfig?: string | undefined } & Record<string, unknown>,
>(a: T, b: T) {
  const { rawConfig: rawConfigB, ...configB } = b;
  let config = mergeConfigYAML(a, configB);

  const parsedRawConfigB =
    rawConfigB === undefined ? undefined : parse(rawConfigB);

  if (parsedRawConfigB !== undefined) {
    config = mergeConfigYAML(config, parsedRawConfigB);
  }

  return config;
}

export async function resolveNoxConfigYAML(
  globalNoxConfig: NoxConfigYAML | undefined = {},
  computePeerNoxConfig: NoxConfigYAML | undefined = {},
  { i = 0, signingWallet = "" }: { i?: number; signingWallet?: string } = {},
) {
  const env = await ensureChainEnv();
  const isLocal = env === "local";

  let config = mergeConfigYAMLWithRawConfig(
    await getDefaultNoxConfigYAML(),
    globalNoxConfig,
  );

  config = mergeConfigYAMLWithRawConfig(config, computePeerNoxConfig);

  /* eslint-disable @typescript-eslint/consistent-type-assertions */

  const tcpPort =
    (config["tcp_port"] as number | undefined) ??
    config.tcpPort ??
    (isLocal ? TCP_PORT_START - i : TCP_PORT_START);

  const websocketPort =
    (config["websocket_port"] as number | undefined) ??
    config.websocketPort ??
    (isLocal ? WEB_SOCKET_PORT_START - i : WEB_SOCKET_PORT_START);

  const httpPort =
    (config["http_port"] as number | undefined) ??
    config.httpPort ??
    (isLocal ? HTTP_PORT_START - i : HTTP_PORT_START);

  const walletPrivateKey =
    // @ts-expect-error we allow user to put anything in raw config
    (config["chain_config"]?.["wallet_key"] as string | undefined) ??
    config.chain?.walletPrivateKey ??
    signingWallet;

  /* eslint-enable @typescript-eslint/consistent-type-assertions */

  if (config.chain?.walletPrivateKey === undefined) {
    config.chain = { ...config.chain, walletPrivateKey };
  }

  let ipfs: undefined | NoxConfigYAML["ipfs"];
  // eslint-disable-next-line prefer-const
  ({ ipfs, ...config } = config);

  config.systemServices = {
    ...config.systemServices,
    aquaIpfs: {
      ...config.systemServices?.aquaIpfs,
      externalApiMultiaddr:
        config.systemServices?.aquaIpfs?.externalApiMultiaddr ??
        ipfs?.externalApiMultiaddr ??
        EXTERNAL_API_MULTIADDRS[env],
      localApiMultiaddr:
        config.systemServices?.aquaIpfs?.localApiMultiaddr ??
        ipfs?.localApiMultiaddr ??
        LOCAL_API_MULTIADDRS[env],
      ipfsBinaryPath:
        config.systemServices?.aquaIpfs?.ipfsBinaryPath ??
        ipfs?.ipfsBinaryPath ??
        DEFAULT_IPFS_BINARY_PATH,
    },
  };

  return { ...config, tcpPort, websocketPort, httpPort };
}

const EXTERNAL_API_MULTIADDRS: Record<ChainENV, string> = {
  mainnet: "/dns4/ipfs.kras.fluence.dev/tcp/5020",
  testnet: "/dns4/ipfs.dar.fluence.dev/tcp/5020",
  stage: "/dns4/ipfs.fluence.dev/tcp/5001",
  local: LOCAL_IPFS_ADDRESS,
};

export const NOX_IPFS_MULTIADDR = `/dns4/${IPFS_CONTAINER_NAME}/tcp/${IPFS_PORT}`;

const LOCAL_API_MULTIADDRS: Record<ChainENV, string> = {
  ...EXTERNAL_API_MULTIADDRS,
  local: NOX_IPFS_MULTIADDR,
};

export async function getDefaultNoxConfigYAML(): Promise<NoxConfigYAML> {
  const env = await ensureChainEnv();
  const networkId = await getChainId();
  const { RPC_URLS } = await import("@fluencelabs/deal-ts-clients");
  const envConfig = await initEnvConfig();

  const CHAIN_URLS_FOR_CONTAINERS = {
    ...RPC_URLS,
    local: `http://${CHAIN_RPC_CONTAINER_NAME}:${CHAIN_RPC_PORT}`,
  };

  return {
    aquavmPoolSize: DEFAULT_AQUAVM_POOL_SIZE,
    ipfs: {
      externalApiMultiaddr: EXTERNAL_API_MULTIADDRS[env],
      localApiMultiaddr: LOCAL_API_MULTIADDRS[env],
      ipfsBinaryPath: DEFAULT_IPFS_BINARY_PATH,
    },
    systemServices: {
      enable: ["aqua-ipfs", "decider"],
      decider: {
        deciderPeriodSec: 30,
        workerIpfsMultiaddr:
          env === "local"
            ? NOX_IPFS_MULTIADDR
            : "/dns4/ipfs.fluence.dev/tcp/5001",
      },
    },
    chain: {
      httpEndpoint:
        envConfig?.rpcUrl === undefined
          ? CHAIN_URLS_FOR_CONTAINERS[env]
          : envConfig.rpcUrl,
      wsEndpoint: WS_CHAIN_URLS[env],
      diamondContract: (await resolveDeployment()).diamond,
      networkId,
      defaultPriorityFee: 0,
    },
    ccp: {
      proofPollPeriod: DEFAULT_PROOF_POLL_PERIOD,
    },
    ...(env === "local"
      ? {}
      : { bootstrapNodes: await resolveRelaysWithoutLocal(env) }),
    metrics: {
      enabled: true,
      timerResolution: DEFAULT_TIMER_RESOLUTION,
      tokioMetricsEnabled: true,
    },
  };
}
