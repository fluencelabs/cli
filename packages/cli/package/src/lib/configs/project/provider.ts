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

import { writeFile } from "fs/promises";
import { join } from "path";

import { type JsonMap, parse } from "@iarna/toml";
import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import { isUndefined, mapValues, omitBy } from "lodash-es";
import cloneDeep from "lodash-es/cloneDeep.js";
import isEmpty from "lodash-es/isEmpty.js";
import kebabCase from "lodash-es/kebabCase.js";
import mapKeys from "lodash-es/mapKeys.js";
import mergeWith from "lodash-es/mergeWith.js";
import snakeCase from "lodash-es/snakeCase.js";
import times from "lodash-es/times.js";

import {
  jsonStringify,
  CHAIN_RPC_PORT,
  type ChainENV,
} from "../../../common.js";
import { versions } from "../../../versions.js";
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import { getChainId } from "../../chain/chainConfig.js";
import {
  ccDurationValidator,
  validateAddress,
  validateProtocolVersion,
} from "../../chain/chainValidators.js";
import { commandObj, isInteractive } from "../../commandObj.js";
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
  LOCAL_IPFS_ADDRESS,
  TOML_EXT,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
  defaultNumberProperties,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_STAKER_REWARD,
  DURATION_EXAMPLE,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
  WS_CHAIN_URLS,
  PT_SYMBOL,
  DEFAULT_CURL_EFFECTOR_CID,
  CHAIN_RPC_CONTAINER_NAME,
  CLI_NAME,
  DEFAULT_NUMBER_OF_LOCAL_NET_NOXES,
  DEFAULT_VM_EFFECTOR_CID,
} from "../../const.js";
import { resolveDeployment } from "../../dealClient.js";
import { ensureChainEnv } from "../../ensureChainNetwork.js";
import { type ProviderConfigArgs } from "../../generateUserProviderConfig.js";
import { getPeerIdFromSecretKey } from "../../helpers/getPeerIdFromSecretKey.js";
import { boolToStr, numToStr } from "../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../helpers/utils.js";
import {
  type ValidationResult,
  validateCIDs,
} from "../../helpers/validations.js";
import { validateBatchAsync } from "../../helpers/validations.js";
import { genSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { resolveRelaysWithoutLocal } from "../../multiaddresWithoutLocal.js";
import {
  ensureFluenceConfigsDir,
  getProviderConfigPath,
  getFluenceDir,
  ensureFluenceSecretsFilePath,
  ensureFluenceCCPConfigsDir,
} from "../../paths.js";
import { input, list } from "../../prompt.js";
import { envConfig, setEnvConfig } from "../globalConfigs.js";
import {
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
  getConfigInitFunction,
} from "../initConfig.js";

import { initNewEnvConfig } from "./env.js";
import { initNewProviderSecretsConfig } from "./providerSecrets.js";

type CapacityCommitmentV0 = {
  duration: string;
  rewardDelegationRate: number;
  delegator?: string;
};

const capacityCommitmentSchemaV0 = {
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
} as const satisfies JSONSchemaType<CapacityCommitmentV0>;

type CapacityCommitmentV1 = Omit<
  CapacityCommitmentV0,
  "rewardDelegationRate"
> & {
  stakerReward: number;
};

const capacityCommitmentSchemaV1 = {
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
} as const satisfies JSONSchemaType<CapacityCommitmentV1>;

export type OfferV0 = {
  minPricePerWorkerEpoch: string;
  computePeers: Array<string>;
  effectors?: Array<string>;
  minProtocolVersion?: number;
  maxProtocolVersion?: number;
};

type Effector = {
  wasmCID: string;
  allowedBinaries?: Record<string, string>;
};

type NoxConfigYAMLV0 = {
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
  chainConfig?: {
    httpEndpoint?: string;
    coreContractAddress?: string;
    ccContractAddress?: string;
    marketContractAddress?: string;
    networkId?: number;
    walletKey?: string;
  };
};

const NOX_IPFS_MULTIADDR = `/dns4/${IPFS_CONTAINER_NAME}/tcp/${IPFS_PORT}`;

const effectorSchema = {
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

const noxConfigYAMLSchemaV0 = {
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
    chainConfig: {
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
} as const satisfies JSONSchemaType<NoxConfigYAMLV0>;

type NoxConfigYAMLV1 = Omit<NoxConfigYAMLV0, "chainConfig"> & {
  chain?: Omit<
    NonNullable<NoxConfigYAMLV0["chainConfig"]>,
    | "coreContractAddress"
    | "ccContractAddress"
    | "marketContractAddress"
    | "walletKey"
  > & {
    wsEndpoint?: string;
    dealSyncStartBlock?: string;
    marketContract?: string;
    ccContract?: string;
    coreContract?: string;
    diamondContract?: string;
    walletPrivateKey?: string;
    defaultBaseFee?: number;
    defaultPriorityFee?: number;
  };
  ccp?: {
    ccpEndpoint?: string;
    proofPollPeriod?: string;
  };
  ipfs?: {
    externalApiMultiaddr?: string;
    localApiMultiaddr?: string;
    ipfsBinaryPath?: string;
  };
  cpusRange?: string;
  systemCpuCount?: number;
  listenIp?: string;
  externalMultiaddresses?: Array<string>;
  metrics?: {
    enabled?: boolean;
    timerResolution?: string;
    tokioMetricsEnabled?: boolean;
    tokioDetailedMetricsEnabled?: boolean;
  };
  bootstrapNodes?: Array<string>;
  vm?: {
    libvirtUri?: string;
    allowGpu?: boolean;
    network: {
      bridgeName?: string;
      publicIp: string;
      vmIp?: string;
      portRange?: {
        start?: number;
        end?: number;
      };
      hostSshPort?: number;
      vmSshPort?: number;
    };
  };
};

const DEFAULT_TIMER_RESOLUTION = "1 minute";
const DEFAULT_PROOF_POLL_PERIOD = "60 seconds";
const DEFAULT_IPFS_BINARY_PATH = "/usr/bin/ipfs";

const noxConfigYAMLSchemaV1 = {
  type: "object",
  description:
    "Configuration to pass to the nox compute peer. Config.toml files are generated from this config",
  properties: {
    tcpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container TCP port to use. Default: ${numToStr(
        TCP_PORT_START,
      )} (on local network ports will be generated by default)`,
    },
    websocketPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container WebSocket port to use. Default: ${numToStr(
        WEB_SOCKET_PORT_START,
      )} (on local network ports will be generated by default)`,
    },
    httpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container HTTP port to use. Default: ${numToStr(
        HTTP_PORT_START,
      )} (on local network ports will be generated by default)`,
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
              description: `Path to the IPFS binary. Default: ${DEFAULT_IPFS_BINARY_PATH}`,
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
              description: `Network API endpoint (deprecated)`,
            },
            networkId: {
              nullable: true,
              type: "integer",
              description: `Network ID (deprecated)`,
            },
            startBlock: {
              nullable: true,
              type: "string",
              description: `Start block (deprecated)`,
            },
            matcherAddress: {
              nullable: true,
              type: "string",
              description: `Matcher address (deprecated)`,
            },
            walletKey: {
              nullable: true,
              type: "string",
              description: `Wallet key (deprecated)`,
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
    chain: {
      nullable: true,
      type: "object",
      description: "Chain config",
      additionalProperties: false,
      properties: {
        dealSyncStartBlock: {
          nullable: true,
          type: "string",
          description: `Start block (deprecated)`,
        },
        wsEndpoint: {
          nullable: true,
          type: "string",
          description: `WebSocket endpoint of the chain`,
        },
        httpEndpoint: {
          nullable: true,
          type: "string",
          description: `HTTP endpoint of the chain`,
        },
        coreContract: {
          nullable: true,
          type: "string",
          description: `Core contract address (deprecated)`,
        },
        ccContract: {
          nullable: true,
          type: "string",
          description: `Capacity commitment contract address (deprecated)`,
        },
        marketContract: {
          nullable: true,
          type: "string",
          description: `Market contract address (deprecated)`,
        },
        diamondContract: {
          nullable: true,
          type: "string",
          description: `Diamond contract address`,
        },
        networkId: {
          nullable: true,
          type: "integer",
          description: `Network ID`,
        },
        walletPrivateKey: {
          nullable: true,
          type: "string",
          description: `Nox wallet private key. Is generated by default`,
        },
        defaultBaseFee: {
          nullable: true,
          type: "number",
          description: `Default base fee`,
        },
        defaultPriorityFee: {
          nullable: true,
          type: "number",
          description: `Default priority fee`,
        },
      },
      required: [],
    },
    ccp: {
      nullable: true,
      type: "object",
      description: "For advanced users. CCP config",
      additionalProperties: false,
      properties: {
        ccpEndpoint: {
          nullable: true,
          type: "string",
          description: `CCP endpoint. Default comes from top-level ccp config: http://{ccp.rpcEndpoint.host}:{ccp.rpcEndpoint.port}`,
        },
        proofPollPeriod: {
          nullable: true,
          type: "string",
          description: `Proof poll period. Default: ${DEFAULT_PROOF_POLL_PERIOD}`,
          default: DEFAULT_PROOF_POLL_PERIOD,
        },
      },
      required: [],
    },
    ipfs: {
      nullable: true,
      type: "object",
      description: "IPFS config",
      additionalProperties: false,
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
          description: `Path to the IPFS binary. Default: ${DEFAULT_IPFS_BINARY_PATH}`,
        },
      },
      required: [],
    },
    cpusRange: {
      nullable: true,
      type: "string",
      description: `Range of CPU cores to use. Default: 1-32`,
    },
    systemCpuCount: {
      nullable: true,
      type: "integer",
      minimum: 1,
      description: `Number of CPU cores to allocate for the Nox itself. Default: 1`,
    },
    listenIp: {
      nullable: true,
      type: "string",
      format: "ipv4",
      description: `IP to listen on`,
    },
    externalMultiaddresses: {
      nullable: true,
      type: "array",
      items: { type: "string" },
      description: `List of external multiaddresses`,
    },
    metrics: {
      nullable: true,
      type: "object",
      description: "Metrics configuration",
      additionalProperties: false,
      properties: {
        enabled: {
          nullable: true,
          type: "boolean",
          description: `Metrics enabled. Default: true`,
          default: true,
        },
        timerResolution: {
          nullable: true,
          type: "string",
          description: `Timer resolution. Default: ${DEFAULT_TIMER_RESOLUTION}`,
          default: DEFAULT_TIMER_RESOLUTION,
        },
        tokioMetricsEnabled: {
          nullable: true,
          type: "boolean",
          description: `Tokio metrics enabled. Default: true`,
          default: true,
        },
        tokioDetailedMetricsEnabled: {
          nullable: true,
          type: "boolean",
          description: `Tokio detailed metrics enabled`,
        },
      },
      required: [],
    },
    bootstrapNodes: {
      nullable: true,
      type: "array",
      items: { type: "string" },
      description: `List of bootstrap nodes. Default: all addresses for the selected env`,
    },
    rawConfig: {
      nullable: true,
      type: "string",
      description: `Raw TOML config string to parse and merge with the rest of the config. Has the highest priority`,
    },
    vm: {
      type: "object",
      description: "VM Configuration",
      additionalProperties: false,
      nullable: true,
      required: ["network"],
      properties: {
        libvirtUri: {
          nullable: true,
          type: "string",
          description: `QEMU Socket`,
        },
        allowGpu: {
          nullable: true,
          type: "boolean",
          description: `Whether to add info about GPUs to VM's XML`,
        },
        network: {
          type: "object",
          description: "VM Network Configuration",
          additionalProperties: false,
          nullable: false,
          required: ["publicIp"],
          properties: {
            bridgeName: {
              nullable: true,
              type: "string",
              description: `Name of the network bridge device`,
            },
            publicIp: {
              nullable: false,
              type: "string",
              format: "ipv4",
              description: `Public IP address to assign the VM. Must be publicly accessible.`,
            },
            vmIp: {
              nullable: true,
              type: "string",
              format: "ipv4",
              description: `Internal IP address to assign the VM`,
            },
            portRange: {
              type: "object",
              description: "iptables-mapped port range from Host to VM",
              additionalProperties: false,
              nullable: true,
              required: [],
              properties: {
                start: {
                  nullable: true,
                  type: "integer",
                  description: `Start of the iptables-mapped port range from Host to VM`,
                },
                end: {
                  nullable: true,
                  type: "integer",
                  description: `End of the iptables-mapped port range from Host to VM`,
                },
              },
            },
            hostSshPort: {
              nullable: true,
              type: "integer",
              description: `Host SSH port, default is 922`,
            },
            vmSshPort: {
              nullable: true,
              type: "integer",
              description: `VM SSH port, default is 22`,
            },
          },
        },
      },
    },
  },
  required: [],
  nullable: true,
  additionalProperties: false,
} as const satisfies JSONSchemaType<NoxConfigYAMLV1>;

type CCPConfigYAMLV1 = {
  rpcEndpoint?: {
    host?: string;
    port?: number;
    utilityThreadIds?: Array<number>;
  };
  prometheusEndpoint?: {
    host?: string;
    port?: number;
  };
  logs?: {
    reportHashrate?: boolean;
    logLevel?: string;
  };
  state?: {
    path?: string;
  };
  rawConfig?: string;
};

const DEFAULT_RPC_ENDPOINT_HOST = "0.0.0.0";
const DEFAULT_RPC_ENDPOINT_PORT = 9389;
const DEFAULT_PROMETHEUS_ENDPOINT_HOST = "0.0.0.0";
const DEFAULT_PROMETHEUS_ENDPOINT_PORT = 9384;
const DEFAULT_REPORT_HASHRATE = false;
const DEFAULT_LOG_LEVEL = "debug";
const DEFAULT_STATE_PATH = "./state";
const DEFAULT_UTILITY_THREAD_IDS = [1];

const ccpConfigYAMLSchemaV1 = {
  type: "object",
  description: "Configuration to pass to the Capacity Commitment Prover",
  properties: {
    rpcEndpoint: {
      type: "object",
      description: "RPC endpoint configuration",
      additionalProperties: false,
      nullable: true,
      properties: {
        host: {
          nullable: true,
          type: "string",
          description: `RPC host. Default: ${DEFAULT_RPC_ENDPOINT_HOST}`,
          default: DEFAULT_RPC_ENDPOINT_HOST,
        },
        port: {
          nullable: true,
          type: "integer",
          description: `RPC port. Default: ${numToStr(
            DEFAULT_RPC_ENDPOINT_PORT,
          )}`,
          default: DEFAULT_RPC_ENDPOINT_PORT,
        },
        utilityThreadIds: {
          nullable: true,
          type: "array",
          items: { type: "integer" },
          description: `Utility thread IDs`,
        },
      },
      required: [],
    },
    prometheusEndpoint: {
      type: "object",
      description: "Prometheus endpoint configuration",
      additionalProperties: false,
      nullable: true,
      properties: {
        host: {
          nullable: true,
          type: "string",
          description: `Prometheus host. Default: ${DEFAULT_PROMETHEUS_ENDPOINT_HOST}`,
          default: DEFAULT_PROMETHEUS_ENDPOINT_HOST,
        },
        port: {
          nullable: true,
          type: "integer",
          description: `Prometheus port. Default: ${numToStr(
            DEFAULT_PROMETHEUS_ENDPOINT_PORT,
          )}`,
          default: DEFAULT_PROMETHEUS_ENDPOINT_PORT,
        },
      },
      required: [],
    },
    logs: {
      type: "object",
      description: "Logs configuration",
      additionalProperties: false,
      nullable: true,
      properties: {
        reportHashrate: {
          nullable: true,
          type: "boolean",
          description: `Report hashrate. Default: ${boolToStr(
            DEFAULT_REPORT_HASHRATE,
          )}`,
          default: DEFAULT_REPORT_HASHRATE,
        },
        logLevel: {
          nullable: true,
          type: "string",
          description: `Log level. Default: ${DEFAULT_LOG_LEVEL}`,
          default: DEFAULT_LOG_LEVEL,
        },
      },
      required: [],
    },
    state: {
      type: "object",
      description: "State configuration",
      additionalProperties: false,
      nullable: true,
      properties: {
        path: {
          nullable: true,
          type: "string",
          description: `Path to the state file. Default: ${DEFAULT_STATE_PATH}`,
          default: DEFAULT_STATE_PATH,
        },
      },
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
} as const satisfies JSONSchemaType<CCPConfigYAMLV1>;

type ComputePeerV0 = {
  computeUnits: number;
  nox?: NoxConfigYAMLV0;
};

type ConfigV0 = {
  providerName: string;
  offers: Record<string, OfferV0>;
  computePeers: Record<string, ComputePeerV0>;
  capacityCommitments: Record<string, CapacityCommitmentV0>;
  nox?: NoxConfigYAMLV0;
  version: 0;
};

const offerSchemaV0 = {
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
} as const satisfies JSONSchemaType<OfferV0>;

const computePeerSchemaV0 = {
  type: "object",
  description: "Defines a compute peer",
  additionalProperties: false,
  properties: {
    computeUnits: {
      type: "integer",
      description: `How many compute units should nox have. Default: ${numToStr(
        DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
      )} (each compute unit requires ${COMPUTE_UNIT_MEMORY_STR} of RAM)`,
    },
    nox: noxConfigYAMLSchemaV0,
  },
  required: ["computeUnits"],
} as const satisfies JSONSchemaType<ComputePeerV0>;

const configSchemaV0Obj = {
  type: "object",
  additionalProperties: false,
  properties: {
    providerName: {
      description: "Provider name. Must not be empty",
      type: "string",
      minLength: 1,
    },
    offers: {
      description: "A map with offer names as keys and offers as values",
      type: "object",
      additionalProperties: offerSchemaV0,
      properties: {
        Offer: offerSchemaV0,
      },
      required: [],
    },
    computePeers: {
      description:
        "A map with compute peer names as keys and compute peers as values",
      type: "object",
      additionalProperties: computePeerSchemaV0,
      properties: {
        ComputePeer: computePeerSchemaV0,
      },
      required: [],
    },
    nox: noxConfigYAMLSchemaV0,
    capacityCommitments: {
      description:
        "A map with nox names as keys and capacity commitments as values",
      type: "object",
      additionalProperties: capacityCommitmentSchemaV0,
      properties: {
        noxName: capacityCommitmentSchemaV0,
      },
      required: [],
    },
    version: { type: "integer", const: 0, description: "Config version" },
  },
  required: [
    "version",
    "computePeers",
    "offers",
    "providerName",
    "capacityCommitments",
  ],
} as const satisfies JSONSchemaType<ConfigV0>;

const configSchemaV0: JSONSchemaType<ConfigV0> = configSchemaV0Obj;

type ComputePeerV1 = Omit<ComputePeerV0, "nox"> & {
  nox?: NoxConfigYAMLV1;
  ccp?: CCPConfigYAMLV1;
};

const computePeerSchemaV1 = {
  type: "object",
  description: "Defines a compute peer",
  additionalProperties: false,
  properties: {
    computeUnits: {
      type: "integer",
      description: `How many compute units should nox have. Default: ${numToStr(
        DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
      )} (each compute unit requires ${COMPUTE_UNIT_MEMORY_STR} of RAM)`,
    },
    nox: noxConfigYAMLSchemaV1,
    ccp: ccpConfigYAMLSchemaV1,
  },
  required: ["computeUnits"],
} as const satisfies JSONSchemaType<ComputePeerV1>;

type ConfigV1 = Omit<ConfigV0, "version" | "nox" | "computePeers"> & {
  version: 1;
  nox?: NoxConfigYAMLV1;
  computePeers: Record<string, ComputePeerV1>;
  ccp?: CCPConfigYAMLV1;
};

const configSchemaV1Obj = {
  type: "object",
  additionalProperties: false,
  properties: {
    providerName: {
      description: "Provider name. Must not be empty",
      type: "string",
      minLength: 1,
    },
    offers: {
      description: "A map with offer names as keys and offers as values",
      type: "object",
      additionalProperties: offerSchemaV0,
      properties: {
        Offer: offerSchemaV0,
      },
      required: [],
    },
    computePeers: {
      description:
        "A map with compute peer names as keys and compute peers as values",
      type: "object",
      additionalProperties: computePeerSchemaV1,
      properties: {
        ComputePeer: computePeerSchemaV1,
      },
      required: [],
    },
    nox: noxConfigYAMLSchemaV1,
    ccp: ccpConfigYAMLSchemaV1,
    capacityCommitments: {
      description:
        "A map with nox names as keys and capacity commitments as values",
      type: "object",
      additionalProperties: capacityCommitmentSchemaV0,
      properties: {
        noxName: capacityCommitmentSchemaV0,
      },
      required: [],
    },
    version: { type: "integer", const: 1, description: "Config version" },
  },
  required: [
    "version",
    "computePeers",
    "offers",
    "providerName",
    "capacityCommitments",
  ],
} as const satisfies JSONSchemaType<ConfigV1>;

const configSchemaV1: JSONSchemaType<ConfigV1> = configSchemaV1Obj;

export type OfferV1 = Omit<OfferV0, "minPricePerWorkerEpoch"> & {
  minPricePerCuPerEpoch: string;
};

type ConfigV2 = Omit<ConfigV1, "version" | "offers"> & {
  version: 2;
  offers: Record<string, OfferV1>;
};

const offerSchemaV1 = {
  type: "object",
  description: "Defines a provider offer",
  additionalProperties: false,
  properties: {
    minPricePerCuPerEpoch: {
      type: "string",
      description: `Minimum price per compute unit per epoch in ${PT_SYMBOL}`,
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
  required: ["minPricePerCuPerEpoch", "computePeers"],
} as const satisfies JSONSchemaType<OfferV1>;

const configSchemaV2Obj = {
  type: "object",
  additionalProperties: false,
  properties: {
    providerName: {
      description: "Provider name. Must not be empty",
      type: "string",
      minLength: 1,
    },
    offers: {
      description: "A map with offer names as keys and offers as values",
      type: "object",
      additionalProperties: offerSchemaV1,
      properties: {
        Offer: offerSchemaV1,
      },
      required: [],
    },
    computePeers: {
      description:
        "A map with compute peer names as keys and compute peers as values",
      type: "object",
      additionalProperties: computePeerSchemaV1,
      properties: {
        ComputePeer: computePeerSchemaV1,
      },
      required: [],
    },
    nox: noxConfigYAMLSchemaV1,
    ccp: ccpConfigYAMLSchemaV1,
    capacityCommitments: {
      description:
        "A map with nox names as keys and capacity commitments as values",
      type: "object",
      additionalProperties: capacityCommitmentSchemaV0,
      properties: {
        noxName: capacityCommitmentSchemaV0,
      },
      required: [],
    },
    version: { type: "integer", const: 2, description: "Config version" },
  },
  required: [
    "version",
    "computePeers",
    "offers",
    "providerName",
    "capacityCommitments",
  ],
} as const satisfies JSONSchemaType<ConfigV2>;

const configSchemaV2: JSONSchemaType<ConfigV2> = configSchemaV2Obj;

type ConfigV3 = Omit<ConfigV2, "version" | "capacityCommitments"> & {
  version: 3;
  capacityCommitments: Record<string, CapacityCommitmentV1>;
};

const configSchemaV3Obj = {
  ...configSchemaV2Obj,
  properties: {
    ...configSchemaV2Obj.properties,
    version: { type: "integer", const: 3, description: "Config version" },
    capacityCommitments: {
      ...configSchemaV2Obj.properties.capacityCommitments,
      additionalProperties: capacityCommitmentSchemaV1,
      properties: {
        noxName: capacityCommitmentSchemaV1,
      },
    },
  },
} as const satisfies JSONSchemaType<ConfigV3>;

const configSchemaV3: JSONSchemaType<ConfigV3> = configSchemaV3Obj;

const latestConfigSchemaObj =
  configSchemaV3Obj satisfies JSONSchemaType<LatestConfig>;

const latestConfigSchema: JSONSchemaType<LatestConfig> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_CONFIG_FULL_FILE_NAME,
  description: `Defines config used for provider set up`,
  ...latestConfigSchemaObj,
};

const ipValidator = ajv.compile({
  type: "string",
  format: "ipv4",
});

function validateIp(value: string) {
  return ipValidator(value) ? true : "Must be a valid IPv4 address";
}

function getDefault(args: ProviderConfigArgs) {
  return async () => {
    const { yamlDiffPatch } = await import("yaml-diff-patch");
    const chainEnv = await ensureChainEnv();
    setEnvConfig(await initNewEnvConfig(chainEnv));
    const isLocal = chainEnv === "local";
    const hasVM = !isLocal && args["no-vm"] !== true;

    const userProvidedConfig: UserProvidedConfig = {
      providerName: "defaultProvider",
      nox: {
        effectors: {
          curl: {
            wasmCID: DEFAULT_CURL_EFFECTOR_CID,
            allowedBinaries: { curl: "/usr/bin/curl" },
          },
          ...(hasVM ? { vm: { wasmCID: DEFAULT_VM_EFFECTOR_CID } } : {}),
        },
      },
      computePeers: {},
      offers: {},
      capacityCommitments: {},
    };

    const numberOfNoxes =
      args.noxes ??
      (isInteractive && !isLocal
        ? Number(
            await input({
              message: `Enter number of compute peers you want to set up`,
              validate(value) {
                return Number.isInteger(Number(value)) && Number(value) > 0
                  ? true
                  : "Must be a positive integer";
              },
            }),
          )
        : DEFAULT_NUMBER_OF_LOCAL_NET_NOXES);

    const computePeerEntries: [string, LatestComputePeer][] = [];

    for (const i of times(numberOfNoxes)) {
      const peerConfig = hasVM
        ? {
            nox: {
              vm: {
                network: {
                  publicIp: isInteractive
                    ? await input({
                        message: `Enter public IP address for nox-${numToStr(i)}`,
                        validate: validateIp,
                      })
                    : "",
                },
              },
            },
          }
        : {};

      computePeerEntries.push([
        `nox-${numToStr(i)}`,
        {
          computeUnits: DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
          ...peerConfig,
        },
      ] as const);
    }

    userProvidedConfig.computePeers = Object.fromEntries(computePeerEntries);

    userProvidedConfig.capacityCommitments = Object.fromEntries(
      Object.keys(userProvidedConfig.computePeers).map((noxName) => {
        return [
          noxName,
          {
            duration: DEFAULT_CC_DURATION,
            stakerReward: DEFAULT_CC_STAKER_REWARD,
          },
        ] as const;
      }),
    );

    userProvidedConfig.offers = {
      [DEFAULT_OFFER_NAME]: {
        ...defaultNumberProperties,
        computePeers: Object.keys(userProvidedConfig.computePeers),
        effectors: [
          DEFAULT_CURL_EFFECTOR_CID,
          ...(hasVM ? [DEFAULT_VM_EFFECTOR_CID] : []),
        ],
      },
    };

    return `# Defines Provider configuration
# You can use \`fluence provider init\` command to generate this config template

# config version
version: ${numToStr(latestConfigSchemaObj.properties.version.const)}

${yamlDiffPatch("", {}, userProvidedConfig)}
  `;
  };
}

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);
const validateConfigSchemaV1 = ajv.compile(configSchemaV1);
const validateConfigSchemaV2 = ajv.compile(configSchemaV2);

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    const { nox, computePeers, ...restConfig } = config;

    const newConfig: Omit<ConfigV1, "computePeers"> = {
      ...restConfig,
      version: 1,
    };

    if (nox !== undefined) {
      newConfig.nox = migrateNoxConfigYAMLV0ToV1(nox);
    }

    return {
      ...newConfig,
      computePeers: migrateComputePeersV0ToV1(computePeers),
    };
  },
  async (config: Config): Promise<ConfigV2> => {
    if (!validateConfigSchemaV1(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    const { offers, ...restConfig } = config;

    return {
      ...restConfig,
      version: 2,
      offers: mapValues(offers, ({ minPricePerWorkerEpoch, ...restConfig }) => {
        return {
          ...restConfig,
          minPricePerCuPerEpoch: minPricePerWorkerEpoch,
        };
      }),
    };
  },
  async (config: Config): Promise<ConfigV3> => {
    if (!validateConfigSchemaV2(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    return {
      ...config,
      version: 3,
      capacityCommitments: mapValues(
        config.capacityCommitments,
        ({ rewardDelegationRate: stakerReward, ...cc }) => {
          return { ...cc, stakerReward };
        },
      ),
    };
  },
];

function migrateComputePeersV0ToV1(
  computePeers: ConfigV0["computePeers"],
): ConfigV1["computePeers"] {
  return mapValues(computePeers, ({ nox, ...computePeer }) => {
    if (nox === undefined) {
      return computePeer;
    }

    return {
      ...computePeer,
      nox: migrateNoxConfigYAMLV0ToV1(nox),
    };
  });
}

function migrateNoxConfigYAMLV0ToV1(nox: NoxConfigYAMLV0) {
  const { chainConfig, ...restNox } = nox;

  if (chainConfig !== undefined) {
    return {
      ...restNox,
      chain: migrateChainConfigV0ToV1(chainConfig),
    };
  }

  return restNox;
}

function migrateChainConfigV0ToV1(
  chainConfig: NonNullable<NoxConfigYAMLV0["chainConfig"]>,
) {
  const { walletKey, ...restChainConfig } = chainConfig;

  return omitBy(
    {
      ...restChainConfig,
      walletPrivateKey: walletKey,
    },
    isUndefined,
  );
}

type LatestComputePeer = ComputePeerV1;
type Config = ConfigV0 | ConfigV1 | ConfigV2 | ConfigV3;
type LatestConfig = ConfigV3;
type LatestCCPConfigYAML = CCPConfigYAMLV1;
type LatestNoxConfigYAML = NoxConfigYAMLV1;
export type ProviderConfig = InitializedConfig<LatestConfig>;
export type ProviderConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const validate: ConfigValidateFunction<LatestConfig> = async (config) => {
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
};

async function validateProtocolVersions(providerConfig: LatestConfig) {
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
  providerConfig: LatestConfig,
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

function validateNoDuplicateNoxNamesInOffers(
  config: LatestConfig,
): ValidationResult {
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

async function validateCC(config: LatestConfig): Promise<ValidationResult> {
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

function validateMissingComputePeers(config: LatestConfig): ValidationResult {
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

const initConfigOptions = {
  allSchemas: [configSchemaV0, configSchemaV1, configSchemaV2, configSchemaV3],
  latestSchema: latestConfigSchema,
  migrations,
  name: PROVIDER_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: () => {
    return getProviderConfigPath();
  },
  getSchemaDirPath: getFluenceDir,
  validate,
};

export type UserProvidedConfig = Omit<LatestConfig, "version">;

export async function initNewReadonlyProviderConfig(
  args: ProviderConfigArgs = {},
) {
  return getReadonlyConfigInitFunction(initConfigOptions, getDefault(args))();
}

export function initReadonlyProviderConfig() {
  return getReadonlyConfigInitFunction(initConfigOptions)();
}

export async function ensureReadonlyProviderConfig() {
  const providerConfig = await initReadonlyProviderConfig();

  if (providerConfig === null) {
    commandObj.error(
      `Please init ${PROVIDER_CONFIG_FULL_FILE_NAME} using '${CLI_NAME} provider init' in order to continue`,
    );
  }

  return providerConfig;
}

export async function initProviderConfigWithPath(path: string) {
  return getConfigInitFunction({
    ...initConfigOptions,
    getConfigOrConfigDirPath: () => {
      return path;
    },
  })();
}

export const providerSchema: JSONSchemaType<LatestConfig> = latestConfigSchema;

function mergeConfigYAML<T>(a: T, b: Record<string, unknown>) {
  return mergeWith(cloneDeep(a), b, (objValue, srcValue) => {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
      return srcValue;
    }

    return undefined;
  });
}

function mergeConfigYAMLWithRawConfig<
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

async function resolveNoxConfigYAML(
  globalNoxConfig: LatestNoxConfigYAML | undefined = {},
  computePeerNoxConfig: LatestNoxConfigYAML | undefined = {},
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

  let ipfs: undefined | LatestNoxConfigYAML["ipfs"];
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

function resolveCCPConfigYAML(
  globalCCPConfig: LatestCCPConfigYAML | undefined = {},
  computePeerCCPConfig: LatestCCPConfigYAML | undefined = {},
) {
  const config = mergeConfigYAMLWithRawConfig(
    getDefaultCCPConfigYAML(),
    globalCCPConfig,
  );

  return mergeConfigYAMLWithRawConfig(config, computePeerCCPConfig);
}

function getObjByKey(obj: Record<string, unknown>, key: string): object {
  if (!(key in obj)) {
    return {};
  }

  const value = obj[key];
  return typeof value === "object" && value !== null ? value : {};
}

function noxConfigYAMLToConfigToml(
  {
    chain: { diamondContract, walletPrivateKey, ...chain } = {},
    ccp,
    listenIp,
    metrics,
    effectors,
    ...config
  }: LatestNoxConfigYAML,
  ccpConfig: LatestCCPConfigYAML,
  env: ChainENV,
) {
  const chainConfig = {
    httpEndpoint: chain.httpEndpoint,
    diamondContractAddress: diamondContract,
    networkId: chain.networkId,
    walletKey: walletPrivateKey,
    defaultBaseFee: chain.defaultBaseFee,
    defaultPriorityFee: chain.defaultPriorityFee,
    ...getObjByKey(config, "chain_config"),
  };

  // Would be too hard to properly type this
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return camelCaseKeysToSnakeCase({
    ...config,
    ...(listenIp === undefined
      ? {}
      : {
          listenConfig: {
            listenIp,
            ...getObjByKey(config, "listen_config"),
          },
        }),
    chainConfig,
    ...(env === "local"
      ? {}
      : {
          chainListenerConfig: {
            wsEndpoint: chain.wsEndpoint,
            ccpEndpoint:
              ccp?.ccpEndpoint ??
              `http://${
                ccpConfig.rpcEndpoint?.host ?? DEFAULT_RPC_ENDPOINT_HOST
              }:${numToStr(
                ccpConfig.rpcEndpoint?.port ?? DEFAULT_RPC_ENDPOINT_PORT,
              )}`,
            proofPollPeriod: ccp?.proofPollPeriod,
            ...getObjByKey(config, "chain_listener_config"),
          },
        }),
    tokioMetricsEnabled: metrics?.tokioMetricsEnabled,
    tokioDetailedMetricsEnabled: metrics?.tokioDetailedMetricsEnabled,
    metricsEnabled: metrics?.enabled,
    metricsTimerResolution: metrics?.timerResolution,
    ...(effectors === undefined
      ? {}
      : {
          effectors: Object.fromEntries(
            Object.entries(effectors).map(
              ([name, { wasmCID, allowedBinaries }]) => {
                return [
                  name,
                  { wasmCID, allowedBinaries: allowedBinaries ?? {} },
                ] as const;
              },
            ),
          ),
        }),
  }) as JsonMap;
}

function ccpConfigYAMLToConfigToml(config: LatestCCPConfigYAML) {
  // Would be too hard to properly type this
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return camelCaseKeysToKebabCase(config) as JsonMap;
}

function camelCaseToDifferentCase(caseFn: (str: string) => string) {
  const camelCaseToDifferentCaseImpl = (val: unknown): unknown => {
    if (typeof val === "object" && val !== null) {
      if (Array.isArray(val)) {
        return val.map(camelCaseToDifferentCaseImpl);
      }

      const objWithSnakeCaseKeys = mapKeys(val, (_, key) => {
        return caseFn(key);
      });

      return Object.fromEntries(
        Object.entries(objWithSnakeCaseKeys).map(([key, value]) => {
          return [key, camelCaseToDifferentCaseImpl(value)];
        }),
      );
    }

    return val;
  };

  return camelCaseToDifferentCaseImpl;
}

function camelCaseKeysToSnakeCase(val: unknown): unknown {
  return camelCaseToDifferentCase(snakeCase)(val);
}

function camelCaseKeysToKebabCase(val: unknown): unknown {
  return camelCaseToDifferentCase(kebabCase)(val);
}

const EXTERNAL_API_MULTIADDRS: Record<ChainENV, string> = {
  mainnet: "/dns4/ipfs.kras.fluence.dev/tcp/5020",
  testnet: "/dns4/ipfs.dar.fluence.dev/tcp/5020",
  stage: "/dns4/ipfs.fluence.dev/tcp/5001",
  local: LOCAL_IPFS_ADDRESS,
};

const LOCAL_API_MULTIADDRS: Record<ChainENV, string> = {
  ...EXTERNAL_API_MULTIADDRS,
  local: NOX_IPFS_MULTIADDR,
};

async function getDefaultNoxConfigYAML(): Promise<LatestNoxConfigYAML> {
  const env = await ensureChainEnv();
  const networkId = await getChainId();
  const { RPC_URLS } = await import("@fluencelabs/deal-ts-clients");

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

function getDefaultCCPConfigYAML(): LatestCCPConfigYAML {
  return {
    rpcEndpoint: {
      host: DEFAULT_RPC_ENDPOINT_HOST,
      port: DEFAULT_RPC_ENDPOINT_PORT,
      utilityThreadIds: DEFAULT_UTILITY_THREAD_IDS,
    },
    prometheusEndpoint: {
      host: DEFAULT_PROMETHEUS_ENDPOINT_HOST,
      port: DEFAULT_PROMETHEUS_ENDPOINT_PORT,
    },
    logs: {
      reportHashrate: DEFAULT_REPORT_HASHRATE,
      logLevel: DEFAULT_LOG_LEVEL,
    },
  };
}

export function getConfigTomlName(noxName: string) {
  return `${noxName}_Config.${TOML_EXT}`;
}

export function getCCPConfigTomlName(noxName: string) {
  return `${noxName}_Config.${TOML_EXT}`;
}

export function promptForOfferName(offers: ProviderConfigReadonly["offers"]) {
  return list({
    message: "Select offer",
    options: Object.keys(offers),
    oneChoiceMessage(choice) {
      return `Select offer ${color.yellow(choice)}`;
    },
    onNoChoices() {
      commandObj.error("No offers found");
    },
  });
}

export type EnsureComputerPeerConfig = Awaited<
  ReturnType<typeof ensureComputerPeerConfigs>
>[number];

export async function ensureComputerPeerConfigs(computePeerNames?: string[]) {
  const { Wallet } = await import("ethers");
  const providerConfig = await ensureReadonlyProviderConfig();

  const providerSecretsConfig =
    await initNewProviderSecretsConfig(providerConfig);

  const [computePeersWithoutKeys, computePeersWithKeys] = splitErrorsAndResults(
    Object.entries(providerConfig.computePeers)
      .filter(([name]) => {
        return (
          computePeerNames === undefined || computePeerNames.includes(name)
        );
      })
      .map(([computePeerName, computePeer]) => {
        return {
          computePeerName,
          computePeer,
          secretKey: providerSecretsConfig.noxes[computePeerName]?.networkKey,
          signingWallet:
            providerSecretsConfig.noxes[computePeerName]?.signingWallet,
        };
      }),
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
          signingWallet: Wallet.createRandom().privateKey,
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
        providerConfig.capacityCommitments[c.computePeerName];

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
      `Missing capacity commitment for compute peers at ${providerConfig.$getPath()}:\n\n${noCCError
        .map((n) => {
          return `capacityCommitments.${n}`;
        })
        .join("\n")}`,
    );
  }

  const { stringify } = await import("@iarna/toml");
  const configsDir = await ensureFluenceConfigsDir();
  const ccpConfigsDir = await ensureFluenceCCPConfigsDir();
  const env = await ensureChainEnv();

  if (env === "local") {
    const cpWithoutGeneratedPorts = computePeersWithCC.slice(
      WEB_SOCKET_PORT_START - TCP_PORT_START,
    );

    if (
      cpWithoutGeneratedPorts.length > 0 &&
      !cpWithoutGeneratedPorts.every(({ computePeer: { nox } }) => {
        return (
          nox?.httpPort !== undefined &&
          nox.tcpPort !== undefined &&
          nox.websocketPort !== undefined
        );
      })
    ) {
      commandObj.error(
        `Please define httpPort, tcpPort and websocketPort for compute peers ${cpWithoutGeneratedPorts
          .map(({ computePeerName }) => {
            return computePeerName;
          })
          .join(", ")} in ${providerConfig.$getPath()}`,
      );
    }
  }

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
        await writeFile(
          await ensureFluenceSecretsFilePath(computePeerName),
          secretKey,
          FS_OPTIONS,
        );

        const overridenCCPConfig = resolveCCPConfigYAML(
          providerConfig.ccp,
          computePeer.ccp,
        );

        await writeFile(
          join(ccpConfigsDir, getCCPConfigTomlName(computePeerName)),
          stringify(ccpConfigYAMLToConfigToml(overridenCCPConfig)),
          FS_OPTIONS,
        );

        const overriddenNoxConfig = await resolveNoxConfigYAML(
          providerConfig.nox,
          computePeer.nox,
          { i, signingWallet },
        );

        await writeFile(
          join(configsDir, getConfigTomlName(computePeerName)),
          stringify(
            noxConfigYAMLToConfigToml(
              overriddenNoxConfig,
              overridenCCPConfig,
              env,
            ),
          ),
          FS_OPTIONS,
        );

        return {
          name: computePeerName,
          overriddenNoxConfig,
          secretKey,
          peerId: await getPeerIdFromSecretKey(secretKey),
          computeUnits: computePeer.computeUnits,
          walletKey: signingWallet,
          walletAddress: await new Wallet(signingWallet).getAddress(),
          capacityCommitment,
        };
      },
    ),
  );
}
