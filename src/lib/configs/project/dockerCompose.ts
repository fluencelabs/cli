/**
 * Copyright 2024 Fluence DAO
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
import { join, relative } from "path";

import type { JSONSchemaType } from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

import { versions } from "../../../versions.js";
import {
  IPC_DEPLOY_SCRIPT_NAME,
  ETH_API_PORT,
  COMETBFT_NAME,
  CONFIGS_DIR_NAME,
  DOCKER_COMPOSE_FILE_NAME,
  ETH_API_NAME,
  FENDERMINT_NAME,
  GRAPH_NODE_CONTAINER_NAME,
  GRAPH_NODE_PORT,
  HTTP_PORT_START,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
  POSTGRES_CONTAINER_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  COMETBFT_PORT,
  FENDERMINT_PORT,
  BLOCKSCOUT_NAME,
  POSTGRES_PORT,
  BLOCKSCOUT_PORT,
} from "../../const.js";
import { numToStr } from "../../helpers/typesafeStringify.js";
import { genSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { ensureFluenceConfigsDir, getFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  type GetDefaultConfig,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

import schema from "./compose.schema.json" assert { type: "json" };
import { ensureComputerPeerConfigs, getConfigTomlName } from "./provider.js";

type Service = {
  image?: string;
  ports?: string[];
  pull_policy?: string;
  environment?: Record<string, string | number> | string[];
  volumes?: string[];
  command?: string[] | string;
  depends_on?: string[] | Record<string, Record<string, string>>;
  secrets?: string[];
  healthcheck?: Record<string, string | number>;
  build?: Record<string, string | number>;
  restart?: string;
  links?: string[];
};

type ConfigV0 = {
  version: "3";
  services: Record<string, Service>;
  volumes?: Record<string, null>;
  include?: string[];
  secrets?: Record<string, { file?: string }>;
};

// @ts-expect-error - this schema is from official github and it's valid
const configSchemaV0: JSONSchemaType<ConfigV0> = schema;

type GenNoxImageArgs = {
  name: string;
  tcpPort: number;
  webSocketPort: number;
  httpPort: number;
  bootstrapName: string;
  bootstrapTcpPort?: number;
};

function genNox({
  name,
  tcpPort,
  webSocketPort,
  httpPort,
  bootstrapName,
  bootstrapTcpPort,
}: GenNoxImageArgs): [name: string, service: Service] {
  const configTomlName = getConfigTomlName(name);
  const configLocation = `/run/${CONFIGS_DIR_NAME}/${configTomlName}`;
  const tcpPortString = numToStr(tcpPort);
  const websocketPortString = numToStr(webSocketPort);
  return [
    name,
    {
      image: versions.nox,
      ports: [
        `${tcpPortString}:${tcpPortString}`,
        `${websocketPortString}:${websocketPortString}`,
      ],
      environment: {
        WASM_LOG: "debug",
        FLUENCE_MAX_SPELL_PARTICLE_TTL: "9s",
        FLUENCE_ROOT_KEY_PAIR__PATH: `/run/secrets/${name}`,
        RUST_LOG:
          "chain_connector=debug,run-console=trace,aquamarine::log=debug,network=trace,worker_inactive=trace",
      },
      command: [
        `--config=${configLocation}`,
        "--dev-mode",
        "--external-maddrs",
        `/dns4/${name}/tcp/${tcpPortString}`,
        `/dns4/${name}/tcp/${websocketPortString}/ws`,
        "--allow-private-ips",
        bootstrapTcpPort === undefined
          ? "--local"
          : `--bootstraps=/dns/${bootstrapName}/tcp/${numToStr(bootstrapTcpPort)}`,
      ],
      depends_on: {
        [IPFS_CONTAINER_NAME]: { condition: "service_healthy" },
        [ETH_API_NAME]: { condition: "service_healthy" },
        [IPC_DEPLOY_SCRIPT_NAME]: {
          condition: "service_completed_successfully",
        },
      },
      volumes: [
        `./${CONFIGS_DIR_NAME}/${configTomlName}:${configLocation}`,
        `${name}:/.fluence`,
      ],
      secrets: [name],
      healthcheck: {
        test: `curl -f http://localhost:${numToStr(httpPort)}/health`,
        interval: "5s",
        timeout: "2s",
        retries: 10,
      },
    },
  ];
}

async function genDockerCompose(): Promise<LatestConfig> {
  const configsDir = await ensureFluenceConfigsDir();
  const fluenceDir = getFluenceDir();
  const computePeers = await ensureComputerPeerConfigs();

  const peers = await Promise.all(
    computePeers.map(async ({ name, overriddenNoxConfig }) => {
      return {
        ...(await genSecretKeyOrReturnExisting(name)),
        webSocketPort: overriddenNoxConfig.websocketPort,
        tcpPort: overriddenNoxConfig.tcpPort,
        httpPort: overriddenNoxConfig.httpPort,
        relativeConfigFilePath: relative(
          fluenceDir,
          join(configsDir, getConfigTomlName(name)),
        ),
      };
    }),
  );

  const [bootstrap, ...restNoxes] = peers;

  assert(
    bootstrap !== undefined,
    `Unreachable. 'computePeers' non-emptiness is checked during ${PROVIDER_CONFIG_FULL_FILE_NAME} validation`,
  );

  const {
    name: bootstrapName,
    webSocketPort: bootstrapWebSocketPort = WEB_SOCKET_PORT_START,
    tcpPort: bootstrapTcpPort = TCP_PORT_START,
    httpPort: bootstrapHttpPort = HTTP_PORT_START,
  } = bootstrap;

  return {
    version: "3",
    volumes: {
      [COMETBFT_NAME]: null,
      [FENDERMINT_NAME]: null,
      [IPFS_CONTAINER_NAME]: null,
      [POSTGRES_CONTAINER_NAME]: null,
      ...Object.fromEntries(
        peers.map(({ name }) => {
          return [name, null] as const;
        }),
      ),
    },
    secrets: Object.fromEntries(
      peers.map(({ name, relativeSecretFilePath: file }) => {
        return [name, { file }] as const;
      }),
    ),
    services: {
      [IPFS_CONTAINER_NAME]: {
        image: "ipfs/go-ipfs",
        ports: [`${IPFS_PORT}:${IPFS_PORT}`],
        volumes: [`${IPFS_CONTAINER_NAME}:/data/ipfs`],
        healthcheck: {
          test: "ipfs id || exit 1",
          interval: "8s",
          timeout: "10s",
          retries: 20,
        },
      },
      [POSTGRES_CONTAINER_NAME]: {
        image: "postgres:14",
        ports: [`${POSTGRES_PORT}:${POSTGRES_PORT}`],
        command: ["postgres", "-cshared_preload_libraries=pg_stat_statements"],
        environment: {
          POSTGRES_USER: "postgres",
          POSTGRES_PASSWORD: "",
          POSTGRES_HOST_AUTH_METHOD: "trust",
          PGDATA: "/var/lib/postgresql/data",
          POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C",
        },
        volumes: [`${POSTGRES_CONTAINER_NAME}:/var/lib/postgresql/data`],
      },
      [ETH_API_NAME]: {
        image: versions[FENDERMINT_NAME],
        ports: [`${ETH_API_PORT}:${ETH_API_PORT}`],
        command: "eth run",
        environment: {
          FM_NETWORK: "testnet",
          TENDERMINT_RPC_URL: `http://${COMETBFT_NAME}:${COMETBFT_PORT}`,
          TENDERMINT_WS_URL: `ws://${COMETBFT_NAME}:${COMETBFT_PORT}/websocket`,
        },
        // build: {
        //   context: "../",
        //   dockerfile: "./docker/Dockerfile",
        //   target: FENDERMINT_NAME,
        // },
        healthcheck: {
          test: `curl -s -X POST 'http://localhost:${ETH_API_PORT}' -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0", "method":"eth_chainId", "params":[], "id":1}' | jq -e '.result != null'`,
          interval: "8s",
          timeout: "10s",
          retries: 20,
        },
        depends_on: {
          [COMETBFT_NAME]: {
            condition: "service_healthy",
          },
        },
      },
      [FENDERMINT_NAME]: {
        image: versions[FENDERMINT_NAME],
        // build: {
        //   context: "../",
        //   dockerfile: "./docker/Dockerfile",
        //   target: FENDERMINT_NAME,
        // },
        environment: {
          FM_NETWORK: "testnet",
          TENDERMINT_RPC_URL: `http://${COMETBFT_NAME}:${COMETBFT_PORT}`,
        },
        ports: [`${FENDERMINT_PORT}:${FENDERMINT_PORT}`],
        volumes: [`${FENDERMINT_NAME}:/${FENDERMINT_NAME}/data`],
      },
      [COMETBFT_NAME]: {
        image: versions[COMETBFT_NAME],
        // build: {
        //   context: "../",
        //   dockerfile: "./docker/Dockerfile",
        //   target: COMETBFT_NAME,
        // },
        environment: {
          CMT_LOG_LEVEL: "info",
          CMT_LOG_FORMAT: "plain",
          CMT_PROXY_APP: `tcp://${FENDERMINT_NAME}:${FENDERMINT_PORT}`,
        },
        ports: [`${COMETBFT_PORT}:${COMETBFT_PORT}`],
        volumes: [`${COMETBFT_NAME}:/${COMETBFT_NAME}/data`],
        healthcheck: {
          test: "curl --fail http://localhost:26657 || exit 1",
          interval: "8s",
          timeout: "10s",
          retries: 20,
        },
        depends_on: [FENDERMINT_NAME],
      },
      [BLOCKSCOUT_NAME]: {
        image: "offchainlabs/blockscout:v1.0.0-c8db5b1",
        restart: "always",
        links: ["postgres:database"],
        command: [
          "/bin/sh",
          "-c",
          'bin/blockscout eval "Elixir.Explorer.ReleaseTasks.create_and_migrate()"\nnode init/install.js postgres 5432\nbin/blockscout start\n',
        ],
        environment: {
          ETHEREUM_JSONRPC_VARIANT: "geth",
          ETHEREUM_JSONRPC_HTTP_URL: `http://${ETH_API_NAME}:${ETH_API_PORT}/`,
          ETHEREUM_JSONRPC_TRACE_URL: `http://${ETH_API_NAME}:${ETH_API_PORT}/`,
          INDEXER_DISABLE_PENDING_TRANSACTIONS_FETCHER: "true",
          DATABASE_URL: `postgresql://${POSTGRES_CONTAINER_NAME}:@${POSTGRES_CONTAINER_NAME}:${POSTGRES_PORT}/blockscout`,
          ECTO_USE_SSL: "false",
          NETWORK: "local",
          PORT: BLOCKSCOUT_PORT,
        },
        ports: [`127.0.0.1:${BLOCKSCOUT_PORT}:${BLOCKSCOUT_PORT}`],
        depends_on: {
          [ETH_API_NAME]: {
            condition: "service_healthy",
          },
          // [POSTGRES_CONTAINER_NAME]: {
          //   condition: "service_healthy",
          // },
        },
      },
      [GRAPH_NODE_CONTAINER_NAME]: {
        image: "graphprotocol/graph-node:v0.33.0",
        ports: [
          "8000:8000",
          "8001:8001",
          `${GRAPH_NODE_PORT}:${GRAPH_NODE_PORT}`,
          "8030:8030",
          "8040:8040",
        ],
        depends_on: {
          [IPFS_CONTAINER_NAME]: { condition: "service_healthy" },
          [ETH_API_NAME]: { condition: "service_healthy" },
          // [POSTGRES_CONTAINER_NAME]: {
          //   condition: "service_healthy",
          // },
          [IPC_DEPLOY_SCRIPT_NAME]: {
            condition: "service_completed_successfully",
          },
        },
        environment: {
          postgres_host: "postgres",
          postgres_user: "postgres",
          postgres_pass: "",
          postgres_db: "postgres",
          ipfs: `${IPFS_CONTAINER_NAME}:${IPFS_PORT}`,
          ethereum: `local:http://${ETH_API_NAME}:${ETH_API_PORT}`,
          GRAPH_LOG: "info",
          ETHEREUM_REORG_THRESHOLD: 1,
          ETHEREUM_ANCESTOR_COUNT: 1,
        },
      },
      [IPC_DEPLOY_SCRIPT_NAME]: {
        image: versions[IPC_DEPLOY_SCRIPT_NAME],
        // build: {
        //   context: "../",
        //   dockerfile: "./docker/Dockerfile",
        //   target: IPC_DEPLOY_SCRIPT_NAME,
        // },
        command: ["deploy-to-ipc"],
        volumes: [
          "../deployments/:/app/deployments/",
          "../out/:/app/out/",
          "../cache/:/app/cache/",
        ],
        environment: ["EPOCH_DURATION"],
        depends_on: {
          [ETH_API_NAME]: { condition: "service_healthy" },
        },
      },
      ...Object.fromEntries([
        genNox({
          name: bootstrapName,
          tcpPort: bootstrapTcpPort,
          webSocketPort: bootstrapWebSocketPort,
          httpPort: bootstrapHttpPort,
          bootstrapName: bootstrapName,
        }),
      ]),
      ...Object.fromEntries(
        restNoxes.map(({ name, tcpPort, webSocketPort, httpPort }) => {
          return genNox({
            name,
            tcpPort,
            webSocketPort,
            httpPort,
            bootstrapName,
            bootstrapTcpPort,
          });
        }),
      ),
    },
  };
}

async function genDefaultDockerCompose(): Promise<GetDefaultConfig> {
  const def = await genDockerCompose();

  return () => {
    return yamlDiffPatch("", {}, def);
  };
}

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type DockerComposeConfig = InitializedConfig<LatestConfig>;
export type DockerComposeConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

export function dockerComposeDirPath() {
  return getFluenceDir();
}

const initConfigOptions = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DOCKER_COMPOSE_FILE_NAME,
  getConfigOrConfigDirPath: dockerComposeDirPath,
};

export async function initNewDockerComposeConfig() {
  return getConfigInitFunction(
    initConfigOptions,
    await genDefaultDockerCompose(),
  )();
}

export async function initNewReadonlyDockerComposeConfig() {
  return getReadonlyConfigInitFunction(
    initConfigOptions,
    await genDefaultDockerCompose(),
  )();
}

export const initDockerComposeConfig = getConfigInitFunction(initConfigOptions);

export const initReadonlyDockerComposeConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const dockerComposeSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
