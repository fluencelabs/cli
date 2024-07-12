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

import assert from "assert";
import { join, relative } from "path";

import type { JSONSchemaType } from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

import { CHAIN_RPC_PORT } from "../../../common.js";
import { versions } from "../../../versions.js";
import {
  CHAIN_DEPLOY_SCRIPT_NAME,
  CHAIN_RPC_CONTAINER_NAME,
  CONFIGS_DIR_NAME,
  DOCKER_COMPOSE_FILE_NAME,
  GRAPH_NODE_CONTAINER_NAME,
  GRAPH_NODE_PORT,
  HTTP_PORT_START,
  IPFS_CONTAINER_NAME,
  IPFS_PORT,
  POSTGRES_CONTAINER_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  SUBGRAPH_DEPLOY_SCRIPT_NAME,
  TCP_PORT_START,
  WEB_SOCKET_PORT_START,
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
        FLUENCE_MAX_SPELL_PARTICLE_TTL: "30s",
        FLUENCE_ROOT_KEY_PAIR__PATH: `/run/secrets/${name}`,
        RUST_LOG:
          "info,chain_connector=debug,run-console=trace,aquamarine::log=debug,network=trace,worker_inactive=trace,expired=info,spell=debug,ipfs_effector=debug,ipfs_pure=debug,spell_event_bus=trace,system_services=debug,particle_reap=debug,aquamarine::actor=debug,aquamarine::aqua_runtime=off,aquamarine=warn,chain_listener=debug,chain-connector=debug,execution=trace",
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
        "--print-config",
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
      "chain-rpc": null,
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
        volumes: [`chain-rpc:/data`],
        environment: {
          LOCAL_CHAIN_BLOCK_MINING_INTERVAL: 1,
        },
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
          MIN_DURATION: 0,
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
        healthcheck: {
          test: `timeout 10s bash -c ':> /dev/tcp/127.0.0.1/8000' || exit 1`,
          interval: "40s",
          timeout: "30s",
          retries: 3,
          start_period: "60s",
        },
      },
      [SUBGRAPH_DEPLOY_SCRIPT_NAME]: {
        image: versions[SUBGRAPH_DEPLOY_SCRIPT_NAME],
        environment: {
          GRAPHNODE_ADMIN_URL_LOCAL: `http://${GRAPH_NODE_CONTAINER_NAME}:${GRAPH_NODE_PORT}`,
          IPFS_URL: `http://${IPFS_CONTAINER_NAME}:${IPFS_PORT}`,
        },
        depends_on: [GRAPH_NODE_CONTAINER_NAME],
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
