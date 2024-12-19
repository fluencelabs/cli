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

import { versions } from "../../../../versions.js";
import {
  COMPUTE_UNIT_MEMORY_STR,
  DEFAULT_AQUAVM_POOL_SIZE,
  HTTP_PORT_START,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_STAKER_REWARD,
  DURATION_EXAMPLE,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_PEER,
  PT_SYMBOL,
} from "../../../const.js";
import { numToStr } from "../../../helpers/typesafeStringify.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

type CapacityCommitment = {
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
      default: DEFAULT_CC_STAKER_REWARD,
    },
  },
} as const satisfies JSONSchemaType<CapacityCommitment>;

export type CapacityCommitments = Record<string, CapacityCommitment>;

export const capacityCommitmentsSchema = {
  description:
    "A map with nox names as keys and capacity commitments as values",
  type: "object",
  additionalProperties: capacityCommitmentSchema,
  properties: { noxName: capacityCommitmentSchema },
  required: [],
} as const satisfies JSONSchemaType<CapacityCommitments>;

export type Effector = {
  wasmCID: string;
  allowedBinaries?: Record<string, string>;
};

export const effectorSchema = {
  type: "object",
  description: "Effector configuration",
  additionalProperties: false,
  properties: {
    wasmCID: {
      type: "string",
      description: `Wasm CID of the effector`,
    },
    allowedBinaries: {
      type: "object",
      description: `Allowed binaries`,
      additionalProperties: { type: "string" },
      properties: {
        curl: { type: "string" },
      },
      required: [],
      nullable: true,
    },
  },
  required: ["wasmCID"],
} as const satisfies JSONSchemaType<Effector>;

export type ChainConfig = {
  httpEndpoint?: string;
  coreContractAddress?: string;
  ccContractAddress?: string;
  marketContractAddress?: string;
  networkId?: number;
  walletKey?: string;
};

const chainConfigSchema = {
  nullable: true,
  type: "object",
  description: "Chain config",
  additionalProperties: false,
  properties: {
    httpEndpoint: {
      nullable: true,
      type: "string",
      description: `HTTP endpoint of the chain. Same as decider`,
    },
    coreContractAddress: {
      nullable: true,
      type: "string",
      description: `Core contract address`,
    },
    ccContractAddress: {
      nullable: true,
      type: "string",
      description: `Capacity commitment contract address`,
    },
    marketContractAddress: {
      nullable: true,
      type: "string",
      description: `Market contract address`,
    },
    networkId: {
      nullable: true,
      type: "integer",
      description: `Network ID`,
    },
    walletKey: {
      nullable: true,
      type: "string",
      description: `Wallet key`,
    },
  },
  required: [],
} as const satisfies JSONSchemaType<ChainConfig>;

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
      ipfsBinaryPath?: string;
    };
    decider?: {
      deciderPeriodSec?: number;
      workerPeriodSec?: number;
      workerIpfsMultiaddr?: string;
      networkApiEndpoint?: string;
      networkId?: number;
      startBlock?: string;
      matcherAddress?: string;
      walletKey?: string;
    };
  };
  effectors?: Record<string, Effector>;
  rawConfig?: string;
  chainConfig?: ChainConfig;
};

const noxConfigYAMLSchema = {
  type: "object",
  description:
    "Configuration to pass to the nox compute peer. Config.toml files are generated from this config",
  properties: {
    tcpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from ${numToStr(
        TCP_PORT_START,
      )}`,
    },
    websocketPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from ${numToStr(
        WEB_SOCKET_PORT_START,
      )}`,
    },
    httpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from ${numToStr(
        HTTP_PORT_START,
      )}`,
    },
    aquavmPoolSize: {
      nullable: true,
      type: "integer",
      description: `Number of aquavm instances to run. Default: ${numToStr(
        DEFAULT_AQUAVM_POOL_SIZE,
      )}`,
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
            ipfsBinaryPath: {
              nullable: true,
              type: "string",
              description: `Path to the IPFS binary`,
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
              type: "integer",
              description: `Decider period in seconds`,
            },
            workerPeriodSec: {
              nullable: true,
              type: "integer",
              description: `Worker period in seconds`,
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
              type: "integer",
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
    effectors: {
      nullable: true,
      type: "object",
      description: "Effectors to allow on the nox",
      additionalProperties: effectorSchema,
      properties: {
        effectorName: effectorSchema,
      },
      required: [],
    },
    chainConfig: chainConfigSchema,
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

type Offer = {
  minPricePerWorkerEpoch: string;
  computePeers: Array<string>;
  effectors?: Array<string>;
  minProtocolVersion?: number;
  maxProtocolVersion?: number;
};

const offerSchema = {
  type: "object",
  description: "Defines a provider offer",
  additionalProperties: false,
  properties: {
    minPricePerWorkerEpoch: {
      type: "string",
      description: `Minimum price per worker epoch in ${PT_SYMBOL}`,
    },
    computePeers: {
      description: "Number of Compute Units for this Compute Peer",
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
    },
    effectors: { type: "array", items: { type: "string" }, nullable: true },
    minProtocolVersion: {
      type: "integer",
      description: `Min protocol version. Must be less then or equal to maxProtocolVersion. Default: ${numToStr(
        versions.protocolVersion,
      )}`,
      nullable: true,
      default: versions.protocolVersion,
      minimum: 1,
    },
    maxProtocolVersion: {
      type: "integer",
      description: `Max protocol version. Must be more then or equal to minProtocolVersion. Default: ${numToStr(
        versions.protocolVersion,
      )}`,
      nullable: true,
      default: versions.protocolVersion,
      minimum: 1,
    },
  },
  required: ["minPricePerWorkerEpoch", "computePeers"],
} as const satisfies JSONSchemaType<Offer>;

export type Offers = Record<string, Offer>;

export const offersSchema = {
  description: "A map with offer names as keys and offers as values",
  type: "object",
  additionalProperties: offerSchema,
  properties: { Offer: offerSchema },
  required: [],
} as const satisfies JSONSchemaType<Offers>;

type ComputePeer = {
  computeUnits: number;
  nox?: NoxConfigYAML;
};

const computePeerSchema = {
  type: "object",
  description: "Defines a compute peer",
  additionalProperties: false,
  properties: {
    computeUnits: {
      type: "integer",
      description: `How many compute units should nox have. Default: ${numToStr(
        DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_PEER,
      )} (each compute unit requires ${COMPUTE_UNIT_MEMORY_STR} of RAM)`,
    },
    nox: noxConfigYAMLSchema,
  },
  required: ["computeUnits"],
} as const satisfies JSONSchemaType<ComputePeer>;

export type ComputePeers = Record<string, ComputePeer>;

const computePeersSchema = {
  description:
    "A map with compute peer names as keys and compute peers as values",
  type: "object",
  additionalProperties: computePeerSchema,
  properties: {
    ComputePeer: computePeerSchema,
  },
  required: [],
} as const satisfies JSONSchemaType<ComputePeers>;

export const providerNameSchema = {
  description: "Provider name. Must not be empty",
  type: "string",
  minLength: 1,
} as const satisfies JSONSchemaType<string>;

export type Config = {
  providerName: string;
  offers: Offers;
  computePeers: ComputePeers;
  capacityCommitments: CapacityCommitments;
  nox?: NoxConfigYAML;
};

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      providerName: providerNameSchema,
      offers: offersSchema,
      computePeers: computePeersSchema,
      nox: noxConfigYAMLSchema,
      capacityCommitments: capacityCommitmentsSchema,
    },
    required: ["computePeers", "offers", "providerName", "capacityCommitments"],
  },
} satisfies ConfigOptions<undefined, Config>;
