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
import { join, relative } from "path";

import type { JSONSchemaType } from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

import { versions } from "../../../versions.js";
import {
  CHAIN_DEPLOY_SCRIPT_NAME,
  GRAPH_NODE_PORT,
  POSTGRES_CONTAINER_NAME,
  DOCKER_COMPOSE_FILE_NAME,
  IPFS_PORT,
  IPFS_CONTAINER_NAME,
  CHAIN_RPC_PORT,
  CHAIN_RPC_CONTAINER_NAME,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  CONFIGS_DIR_NAME,
  GRAPH_NODE_CONTAINER_NAME,
  SUBGRAPH_DEPLOY_SCRIPT_NAME,
} from "../../const.js";
import { genSecretKeyOrReturnExisting } from "../../keyPairs.js";
import { ensureFluenceConfigsDir, getFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type GetDefaultConfig,
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
  environment?: Record<string, string | number>;
  volumes?: string[];
  command?: string[];
  depends_on?: string[] | Record<string, Record<string, string>>;
  secrets?: string[];
  healthcheck?: Record<string, string | number>;
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
  bootstrapName: string;
  bootstrapTcpPort?: number;
};

function genNox({
  name,
  tcpPort,
  webSocketPort,
  bootstrapName,
  bootstrapTcpPort,
}: GenNoxImageArgs): [name: string, service: Service] {
  const configTomlName = getConfigTomlName(name);
  const configLocation = `/run/${CONFIGS_DIR_NAME}/${configTomlName}`;
  return [
    name,
    {
      image: versions.nox,
      ports: [`${tcpPort}:${tcpPort}`, `${webSocketPort}:${webSocketPort}`],
      environment: {
        WASM_LOG: "debug",
        FLUENCE_MAX_SPELL_PARTICLE_TTL: "9s",
        FLUENCE_ROOT_KEY_PAIR__PATH: `/run/secrets/${name}`,
        RUST_LOG:
          "chain_connector=debug,run-console=trace,aquamarine::log=debug,network=trace,worker_inactive=trace",
      },
      command: [
        `--config=${configLocation}`,
        "--external-maddrs",
        `/dns4/${name}/tcp/${tcpPort}`,
        `/dns4/${name}/tcp/${webSocketPort}/ws`,
        "--allow-private-ips",
        bootstrapTcpPort === undefined
          ? "--local"
          : `--bootstraps=/dns/${bootstrapName}/tcp/${bootstrapTcpPort}`,
      ],
      depends_on: {
        [IPFS_CONTAINER_NAME]: { condition: "service_healthy" },
        [CHAIN_RPC_CONTAINER_NAME]: { condition: "service_healthy" },
        [CHAIN_DEPLOY_SCRIPT_NAME]: {
          condition: "service_completed_successfully",
        },
      },
      volumes: [
        `./${CONFIGS_DIR_NAME}/${configTomlName}:${configLocation}`,
        `${name}:/.fluence`,
      ],
      secrets: [name],
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
  } = bootstrap;

  return {
    version: "3",
    volumes: {
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
        image: "ipfs/kubo",
        ports: [`${IPFS_PORT}:${IPFS_PORT}`, "4001:4001"],
        environment: {
          IPFS_PROFILE: "server",
        },
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
        ports: ["5432:5432"],
        command: ["postgres", "-cshared_preload_libraries=pg_stat_statements"],
        environment: {
          POSTGRES_USER: "graph-node",
          POSTGRES_PASSWORD: "let-me-in",
          POSTGRES_DB: "graph-node",
          PGDATA: "/var/lib/postgresql/data",
          POSTGRES_INITDB_ARGS: "-E UTF8 --locale=C",
        },
        volumes: [`${POSTGRES_CONTAINER_NAME}:/var/lib/postgresql/data`],
      },
      [CHAIN_RPC_CONTAINER_NAME]: {
        image: versions[CHAIN_RPC_CONTAINER_NAME],
        ports: [`${CHAIN_RPC_PORT}:${CHAIN_RPC_PORT}`],
        healthcheck: {
          test: `curl -s -X POST 'http://localhost:${CHAIN_RPC_PORT}' -H 'Content-Type: application/json' --data '{"jsonrpc":"2.0", "method":"eth_chainId", "params":[], "id":1}' | jq -e '.result != null'`,
          interval: "8s",
          timeout: "10s",
          retries: 20,
        },
      },
      [CHAIN_DEPLOY_SCRIPT_NAME]: {
        image: versions[CHAIN_DEPLOY_SCRIPT_NAME],
        environment: {
          CHAIN_RPC_URL: `http://${CHAIN_RPC_CONTAINER_NAME}:${CHAIN_RPC_PORT}`,
          MAX_FAILED_RATIO: "9999",
          IS_MOCKED_RANDOMX: "true",
        },
        depends_on: {
          [CHAIN_RPC_CONTAINER_NAME]: { condition: "service_healthy" },
        },
      },
      [GRAPH_NODE_CONTAINER_NAME]: {
        image: "fluencelabs/graph-node:v0.34.1",
        ports: [
          "8000:8000",
          "8001:8001",
          `${GRAPH_NODE_PORT}:${GRAPH_NODE_PORT}`,
          "8030:8030",
          "8040:8040",
        ],
        depends_on: {
          [IPFS_CONTAINER_NAME]: { condition: "service_healthy" },
          [CHAIN_RPC_CONTAINER_NAME]: { condition: "service_healthy" },
          [CHAIN_DEPLOY_SCRIPT_NAME]: {
            condition: "service_completed_successfully",
          },
        },
        environment: {
          postgres_host: "postgres",
          postgres_user: "graph-node",
          postgres_pass: "let-me-in",
          postgres_db: "graph-node",
          ipfs: `${IPFS_CONTAINER_NAME}:${IPFS_PORT}`,
          ethereum: `local:http://${CHAIN_RPC_CONTAINER_NAME}:${CHAIN_RPC_PORT}`,
          GRAPH_LOG: "info",
          ETHEREUM_REORG_THRESHOLD: 1,
          ETHEREUM_ANCESTOR_COUNT: 1,
        },
      },
      [SUBGRAPH_DEPLOY_SCRIPT_NAME]: {
        image: versions[SUBGRAPH_DEPLOY_SCRIPT_NAME],
        environment: {
          GRAPHNODE_URL: `http://${GRAPH_NODE_CONTAINER_NAME}:${GRAPH_NODE_PORT}`,
          IPFS_URL: `http://${IPFS_CONTAINER_NAME}:${IPFS_PORT}`,
        },
        depends_on: [GRAPH_NODE_CONTAINER_NAME],
      },
      ...Object.fromEntries([
        genNox({
          name: bootstrapName,
          tcpPort: bootstrapTcpPort,
          webSocketPort: bootstrapWebSocketPort,
          bootstrapName: bootstrapName,
        }),
      ]),
      ...Object.fromEntries(
        restNoxes.map(({ name, tcpPort, webSocketPort }, index) => {
          return genNox({
            name,
            tcpPort: tcpPort ?? TCP_PORT_START + index + 1,
            webSocketPort: webSocketPort ?? WEB_SOCKET_PORT_START + index + 1,
            bootstrapName: bootstrapName,
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

const initConfigOptions = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: DOCKER_COMPOSE_FILE_NAME,
  getConfigOrConfigDirPath: getFluenceDir,
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
