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

import { versions } from "../../../versions.js";

export type Service = {
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

export type Config = {
  services: Record<string, Service>;
  volumes?: Record<string, null>;
  include?: string[];
  secrets?: Record<string, { file?: string }>;
};

export const CHAIN_DEPLOY_SCRIPT_NAME = "chain-deploy-script";
export const CHAIN_RPC_CONTAINER_NAME = "chain-rpc";
export const CHAIN_RPC_PORT = "8545";
const GRAPH_NODE_CONTAINER_NAME = "graph-node";
const GRAPH_NODE_PORT = "8020";
export const IPFS_CONTAINER_NAME = "ipfs";
export const IPFS_PORT = "5001";
const POSTGRES_CONTAINER_NAME = "postgres";
const SUBGRAPH_DEPLOY_SCRIPT_NAME = "subgraph-deploy-script";

export const chainContainers: Config = {
  volumes: {
    "chain-rpc": null,
    [IPFS_CONTAINER_NAME]: null,
    [POSTGRES_CONTAINER_NAME]: null,
  },
  services: {
    [IPFS_CONTAINER_NAME]: {
      image: "ipfs/kubo:v0.27.0",
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
      image: "fluencelabs/graph-node:v0.35.1",
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
  },
};
