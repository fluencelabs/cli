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

import { versions } from "../../../versions.js";
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import { getChainId } from "../../chain/chainId.js";
import {
  ccDurationValidator,
  validateAddress,
  validateProtocolVersion,
} from "../../chain/chainValidators.js";
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
  LOCAL_IPFS_ADDRESS,
  TOML_EXT,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
  defaultNumberProperties,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_REWARD_DELEGATION_RATE,
  DURATION_EXAMPLE,
  DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX,
  NOX_NAMES_FLAG_NAME,
  ALL_FLAG_VALUE,
  WS_CHAIN_URLS,
  PT_SYMBOL,
  DEFAULT_CURL_EFFECTOR_CID,
  CHAIN_URLS_FOR_CONTAINERS,
  type ChainENV,
} from "../../const.js";
import { ensureChainEnv } from "../../ensureChainNetwork.js";
import { type ProviderConfigArgs } from "../../generateUserProviderConfig.js";
import { getPeerIdFromSecretKey } from "../../helpers/getPeerIdFromSecretKey.js";
import {
  commaSepStrToArr,
  jsonStringify,
  splitErrorsAndResults,
} from "../../helpers/utils.js";
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
import { checkboxes, list } from "../../prompt.js";
import { setEnvConfig } from "../globalConfigs.js";
import {
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
} from "../initConfig.js";

import { initNewEnvConfig } from "./env.js";
import { initNewProviderSecretsConfig } from "./providerSecrets.js";

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
  minPricePerWorkerEpoch: string;
  computePeers: Array<string>;
  effectors?: Array<string>;
  minProtocolVersion?: number;
  maxProtocolVersion?: number;
};

type Effector = {
  wasmCID: string;
  allowedBinaries: Record<string, string>;
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
    },
  },
  required: ["wasmCID", "allowedBinaries"],
} as const satisfies JSONSchemaType<Effector>;

const noxConfigYAMLSchemaV0 = {
  type: "object",
  description:
    "Configuration to pass to the nox compute peer. Config.toml files are generated from this config",
  properties: {
    tcpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from ${TCP_PORT_START}`,
    },
    websocketPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from ${WEB_SOCKET_PORT_START}`,
    },
    httpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from ${HTTP_PORT_START}`,
    },
    aquavmPoolSize: {
      nullable: true,
      type: "integer",
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
    // new. goes to chain_listener_config
    wsEndpoint?: string;
    // new. goes to decider
    dealSyncStartBlock?: string;
    // renamed
    marketContract?: string;
    ccContract?: string;
    coreContract?: string;
    walletPrivateKey?: string;
  };
  ccp?: {
    // # NOX TOML: chain_listener_config.ccp_endpoint
    // http://{ccp.rpcEndpoint.host}:{ccp.rpcEndpoint.port}
    ccpEndpoint?: string;
    // # NOX TOML: chain_listener_config.proof_poll_period
    // # Optional "60 seconds"
    proofPollPeriod?: string;
  };
  ipfs?: {
    // # TOML: system_services.aqua_ipfs.external_api_multiaddr
    // # Required
    externalApiMultiaddr?: string;
    // # TOML: system_services.aqua_ipfs.local_api_multiaddr
    // # Optional
    localApiMultiaddr?: string;
    ipfsBinaryPath?: string;
  };
  // # these would
  // cpusRange = "1-32" # It's actually possible to do complex things like "1,3-6,7-20,32", Nox will parse
  // systemCpuCount = 1 # That's how much cores to allocate for the Nox itself. 0 is forbidden, cuz don't be greedy!
  cpusRange?: string;
  systemCpuCount?: number;
  // # this would go to listen_config.listen_ip in Nox's Config.toml
  // listenIp = "1.2.3.4"
  // # would go to global external_multiaddresses in TOML
  // externalMultiaddresses = ["/dns4/who.is.it.org/tcp/9999/ws", "/ip4/10.9.8.7/tcp/3210"]
  listenIp?: string;
  externalMultiaddresses?: Array<string>;
  // # prometheus metrics will be available at {listen_id}:{httpPort}/metrics
  // metrics:
  //   # TOML: metrics_config.metrics_enabled
  //   enabled = true
  //   # TOML: metrics_config.metrics_timer_resolution
  //   timer_resolution = "1 minute"
  //   # TOML: tokio_metrics_enabled
  //   tokio_metrics_enabled = true
  //   # TOML: tokio_metrics_poll_histogram_enabled
  //   tokio_detailed_metrics_enabled = true # could be expensive performance-wise
  metrics?: {
    enabled?: boolean;
    timerResolution?: string;
    tokioMetricsEnabled?: boolean;
    tokioDetailedMetricsEnabled?: boolean;
  };
  bootstrapNodes?: Array<string>;
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
      description: `Both host and container TCP port to use. Default: for each nox a unique port is assigned starting from ${TCP_PORT_START}`,
    },
    websocketPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container WebSocket port to use. Default: for each nox a unique port is assigned starting from ${WEB_SOCKET_PORT_START}`,
    },
    httpPort: {
      nullable: true,
      type: "integer",
      description: `Both host and container HTTP port to use. Default: for each nox a unique port is assigned starting from ${HTTP_PORT_START}`,
    },
    aquavmPoolSize: {
      nullable: true,
      type: "integer",
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
    chain: {
      nullable: true,
      type: "object",
      description: "Chain config",
      additionalProperties: false,
      properties: {
        dealSyncStartBlock: {
          nullable: true,
          type: "string",
          description: `Start block`,
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
          description: `Core contract address`,
        },
        ccContract: {
          nullable: true,
          type: "string",
          description: `Capacity commitment contract address`,
        },
        marketContract: {
          nullable: true,
          type: "string",
          description: `Market contract address`,
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
const DEFAULT_LOG_LEVEL = "info";
const DEFAULT_STATE_PATH = "/fluence/data";
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
          description: `RPC port. Default: ${DEFAULT_RPC_ENDPOINT_PORT}`,
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
          description: `Prometheus port. Default: ${DEFAULT_PROMETHEUS_ENDPOINT_PORT}`,
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
          description: `Report hashrate. Default: ${DEFAULT_REPORT_HASHRATE}`,
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
  offers: Record<string, Offer>;
  computePeers: Record<string, ComputePeerV0>;
  capacityCommitments: Record<string, CapacityCommitment>;
  nox?: NoxConfigYAMLV0;
  version: 0;
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
      description: `Min protocol version. Must be less then or equal to maxProtocolVersion. Default: ${versions.protocolVersion}`,
      nullable: true,
      default: versions.protocolVersion,
      minimum: 1,
    },
    maxProtocolVersion: {
      type: "integer",
      description: `Max protocol version. Must be more then or equal to minProtocolVersion. Default: ${versions.protocolVersion}`,
      nullable: true,
      default: versions.protocolVersion,
      minimum: 1,
    },
  },
  required: ["minPricePerWorkerEpoch", "computePeers"],
} as const satisfies JSONSchemaType<Offer>;

const computePeerSchemaV0 = {
  type: "object",
  description: "Defines a compute peer",
  additionalProperties: false,
  properties: {
    computeUnits: {
      type: "integer",
      description: `How many compute units should nox have. Default: ${DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX} (each compute unit requires ${COMPUTE_UNIT_MEMORY_STR} of RAM)`,
    },
    nox: noxConfigYAMLSchemaV0,
  },
  required: ["computeUnits"],
} as const satisfies JSONSchemaType<ComputePeerV0>;

const configSchemaV0 = {
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
      additionalProperties: capacityCommitmentSchema,
      properties: {
        noxName: capacityCommitmentSchema,
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
      description: `How many compute units should nox have. Default: ${DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX} (each compute unit requires ${COMPUTE_UNIT_MEMORY_STR} of RAM)`,
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

const configSchemaV1 = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROVIDER_CONFIG_FULL_FILE_NAME}`,
  title: PROVIDER_CONFIG_FULL_FILE_NAME,
  description: `Defines config used for provider set up`,
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
      additionalProperties: capacityCommitmentSchema,
      properties: {
        noxName: capacityCommitmentSchema,
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

const DEFAULT_NUMBER_OF_LOCAL_NET_NOXES = 3;

function getDefault(args: Omit<ProviderConfigArgs, "name">) {
  return async () => {
    commandObj.logToStderr(
      `Creating new ${color.yellow(PROVIDER_CONFIG_FULL_FILE_NAME)} config!\n`,
    );

    const { yamlDiffPatch } = await import("yaml-diff-patch");
    const chainEnv = await ensureChainEnv();
    setEnvConfig(await initNewEnvConfig(chainEnv));

    const userProvidedConfig: UserProvidedConfig = {
      providerName: "defaultProvider",
      nox: {
        effectors: {
          curl: {
            wasmCID: DEFAULT_CURL_EFFECTOR_CID,
            allowedBinaries: {
              curl: "/usr/bin/curl",
            },
          },
        },
      },
      computePeers: {},
      offers: {},
      capacityCommitments: {},
    };

    // For now we remove interactive mode cause it's too complex and unnecessary
    // if (envConfig?.fluenceEnv === "local") {

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
        effectors: [DEFAULT_CURL_EFFECTOR_CID],
      },
    };

    // } else {
    //   await addComputePeers(args.noxes, userProvidedConfig);
    //   await addOffers(userProvidedConfig);
    // }

    return `# Defines Provider configuration
# You can use \`fluence provider init\` command to generate this config template

# config version
version: 0

${yamlDiffPatch("", {}, userProvidedConfig)}
  `;
  };
}

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
  const {
    coreContractAddress,
    ccContractAddress,
    marketContractAddress,
    walletKey,
    ...restChainConfig
  } = chainConfig;

  return omitBy(
    {
      ...restChainConfig,
      coreContract: coreContractAddress,
      ccContract: ccContractAddress,
      marketContract: marketContractAddress,
      walletPrivateKey: walletKey,
    },
    isUndefined,
  );
}

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
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
  ).filter(({ validity }) => {
    return validity !== true;
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

            const computePeerEffectorsString = jsonStringify(
              [
                ...Object.values(noxConfig.effectors ?? {}).map(
                  ({ wasmCID }) => {
                    return wasmCID;
                  },
                ),
              ].sort(),
            );

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

  if (errors.length > 0) {
    return `Each offer must contain computePeers with matching effectors. Found not matching ones:\n\n${errors.join(
      "\n\n",
    )}`;
  }

  return true;
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
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
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

export const providerSchema: JSONSchemaType<LatestConfig> = configSchemaV1;

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

  let config = mergeConfigYAMLWithRawConfig(
    await getDefaultNoxConfigYAML(),
    globalNoxConfig,
  );

  config = mergeConfigYAMLWithRawConfig(config, computePeerNoxConfig);

  if (config.tcpPort === undefined) {
    config.tcpPort = TCP_PORT_START + i;
  }

  if (config.websocketPort === undefined) {
    config.websocketPort = WEB_SOCKET_PORT_START + i;
  }

  if (config.httpPort === undefined) {
    config.httpPort = HTTP_PORT_START + i;
  }

  if (config.chain?.walletPrivateKey === undefined) {
    config.chain = {
      ...config.chain,
      walletPrivateKey: signingWallet,
    };
  }

  config.systemServices = {
    ...config.systemServices,
    decider: {
      ...config.systemServices?.decider,
      walletKey:
        config.systemServices?.decider?.walletKey ??
        config.chain.walletPrivateKey ??
        signingWallet,
      startBlock:
        config.systemServices?.decider?.startBlock ??
        config.chain.dealSyncStartBlock ??
        DEFAULT_START_BLOCK,
      networkId:
        config.systemServices?.decider?.networkId ??
        config.chain.networkId ??
        (await getChainId()),
    },
  };

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
        getDefaultExternalApiMultiaddr(env),
      localApiMultiaddr:
        config.systemServices?.aquaIpfs?.localApiMultiaddr ??
        ipfs?.localApiMultiaddr ??
        getDefaultLocalApiMultiaddr(env),
      ipfsBinaryPath:
        config.systemServices?.aquaIpfs?.ipfsBinaryPath ??
        ipfs?.ipfsBinaryPath ??
        DEFAULT_IPFS_BINARY_PATH,
    },
  };

  return config;
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

function noxConfigYAMLToConfigToml(
  {
    chain: {
      marketContract,
      ccContract,
      coreContract,
      walletPrivateKey,
      ...chain
    } = {},
    ccp,
    listenIp,
    metrics,
    ...config
  }: LatestNoxConfigYAML,
  ccpConfig: LatestCCPConfigYAML,
  env: ChainENV,
) {
  const chainConfig = {
    httpEndpoint: chain.httpEndpoint,
    coreContractAddress: coreContract,
    ccContractAddress: ccContract,
    marketContractAddress: marketContract,
    networkId: chain.networkId,
    walletKey: walletPrivateKey,
  };

  // Would be too hard to properly type this
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return camelCaseKeysToSnakeCase({
    ...config,
    ...(listenIp === undefined ? {} : { listenConfig: { listenIp } }),
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
              }:${ccpConfig.rpcEndpoint?.port ?? DEFAULT_RPC_ENDPOINT_PORT}`,
            proofPollPeriod: ccp?.proofPollPeriod,
          },
        }),
    tokioMetricsEnabled: metrics?.tokioMetricsEnabled,
    tokioDetailedMetricsEnabled: metrics?.tokioDetailedMetricsEnabled,
    ...(metrics?.enabled !== undefined || metrics?.timerResolution !== undefined
      ? {
          metricsConfig: {
            metricsEnabled: metrics.enabled,
            metricsTimerResolution: metrics.timerResolution,
          },
        }
      : {}),
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

function getDefaultExternalApiMultiaddr(env: string) {
  return env === "local"
    ? LOCAL_IPFS_ADDRESS
    : `/dns4/${env}-ipfs.fluence.dev/tcp/5020`;
}

function getDefaultLocalApiMultiaddr(env: string) {
  return env === "local"
    ? NOX_IPFS_MULTIADDR
    : `/dns4/${env}-ipfs.fluence.dev/tcp/5020`;
}

const DEFAULT_START_BLOCK = "earliest";

async function getDefaultNoxConfigYAML(): Promise<LatestNoxConfigYAML> {
  const env = await ensureChainEnv();
  const networkId = await getChainId();
  const { DealClient } = await import("@fluencelabs/deal-ts-clients");
  const contractAddresses = await DealClient.getContractAddresses(env);

  return {
    aquavmPoolSize: DEFAULT_AQUAVM_POOL_SIZE,
    ipfs: {
      externalApiMultiaddr: getDefaultExternalApiMultiaddr(env),
      localApiMultiaddr: getDefaultLocalApiMultiaddr(env),
      ipfsBinaryPath: DEFAULT_IPFS_BINARY_PATH,
    },
    systemServices: {
      enable: ["aqua-ipfs", "decider"],
      decider: {
        deciderPeriodSec: 10,
        workerIpfsMultiaddr:
          env === "local" ? NOX_IPFS_MULTIADDR : "http://ipfs.fluence.dev",
        networkApiEndpoint: CHAIN_URLS_FOR_CONTAINERS[env],
        matcherAddress: contractAddresses.market,
      },
    },
    chain: {
      httpEndpoint: CHAIN_URLS_FOR_CONTAINERS[env],
      wsEndpoint: WS_CHAIN_URLS[env],
      coreContract: contractAddresses.core,
      ccContract: contractAddresses.capacity,
      marketContract: contractAddresses.market,
      networkId,
      dealSyncStartBlock: DEFAULT_START_BLOCK,
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
    state: {
      path: DEFAULT_STATE_PATH,
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
  const { ethers } = await import("ethers");
  const providerConfig = await initNewReadonlyProviderConfig();

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
          walletAddress: await new ethers.Wallet(signingWallet).getAddress(),
          capacityCommitment,
        };
      },
    ),
  );
}

export async function resolveComputePeersByNames(
  flags: {
    [NOX_NAMES_FLAG_NAME]?: string | undefined;
  } = {},
) {
  const computePeers = await ensureComputerPeerConfigs();

  if (flags[NOX_NAMES_FLAG_NAME] === ALL_FLAG_VALUE) {
    return computePeers;
  }

  const providerConfig = await initNewReadonlyProviderConfig();

  if (flags[NOX_NAMES_FLAG_NAME] === undefined) {
    return checkboxes<EnsureComputerPeerConfig, never>({
      message: `Select one or more nox names from ${providerConfig.$getPath()}`,
      options: computePeers.map((computePeer) => {
        return {
          name: computePeer.name,
          value: computePeer,
        };
      }),
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return "Please select at least one deployment";
        }

        return true;
      },
      oneChoiceMessage(choice) {
        return `One nox found at ${providerConfig.$getPath()}: ${color.yellow(
          choice,
        )}. Do you want to select it`;
      },
      onNoChoices() {
        commandObj.error(
          `You must have at least one nox specified in ${providerConfig.$getPath()}`,
        );
      },
      flagName: NOX_NAMES_FLAG_NAME,
    });
  }

  const noxNames = commaSepStrToArr(flags[NOX_NAMES_FLAG_NAME]);

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

export type ResolvedComputePeer = Awaited<
  ReturnType<typeof resolveComputePeersByNames>
>[number];
