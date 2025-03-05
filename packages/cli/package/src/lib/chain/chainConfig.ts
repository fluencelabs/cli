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

import capitalize from "lodash-es/capitalize.js";

import type { ChainENV } from "../../common.js";
import { commandObj } from "../commandObj.js";
import {
  CHAIN_RPC_CONTAINER_NAME,
  CHAIN_RPC_PORT,
} from "../configs/project/chainContainers.js";
import { initEnvConfig, initNewEnvConfig } from "../configs/project/env/env.js";
import { dbg } from "../dbg.js";
import { ensureChainEnv } from "../ensureChainNetwork.js";
import { numToStr } from "../helpers/typesafeStringify.js";
import { password } from "../prompt.js";

let chainIdPromise: Promise<number> | undefined;

export async function getChainId() {
  if (chainIdPromise === undefined) {
    chainIdPromise = (async () => {
      const chainEnv = await ensureChainEnv();
      const { CHAIN_IDS } = await import("@fluencelabs/deal-ts-clients");
      let chainId: number = CHAIN_IDS[chainEnv];
      const envConfig = await initEnvConfig();

      if (envConfig?.perEnvConfig?.[chainEnv]?.chainId !== undefined) {
        const customChainId = envConfig.perEnvConfig[chainEnv].chainId;

        commandObj.logToStderr(
          `Using custom chain ID: ${numToStr(customChainId)} from ${envConfig.$getPath()}`,
        );

        chainId = customChainId;
      }

      dbg(`chainId: ${numToStr(chainId)}`);
      return chainId;
    })();
  }

  return chainIdPromise;
}

let rpcUrlPromise: Promise<string> | undefined;

export async function getRpcUrl() {
  if (rpcUrlPromise === undefined) {
    rpcUrlPromise = (async () => {
      const chainEnv = await ensureChainEnv();
      let rpcUrl: string | undefined;
      let envConfig = await initEnvConfig();

      if (envConfig?.perEnvConfig?.[chainEnv]?.rpcHttpUrl !== undefined) {
        const customRpcUrl = envConfig.perEnvConfig[chainEnv].rpcHttpUrl;
        rpcUrl = customRpcUrl;
      } else if (chainEnv === "local") {
        rpcUrl = "http://localhost:8545";
      } else {
        rpcUrl = await password({
          message: `Enter private HTTP RPC URL to use with ${chainEnv} env`,
        });

        envConfig = await initNewEnvConfig();
        const perEnvConfig = envConfig.perEnvConfig ?? {};
        perEnvConfig[chainEnv] = perEnvConfig[chainEnv] ?? {};
        perEnvConfig[chainEnv].rpcHttpUrl = rpcUrl;
        envConfig.perEnvConfig = perEnvConfig;
        await envConfig.$commit();
      }

      dbg(`rpcUrl: ${rpcUrl}`);
      return rpcUrl;
    })();
  }

  return rpcUrlPromise;
}

let wsUrlPromise: Promise<string> | undefined;

export async function getWsUrl() {
  if (wsUrlPromise === undefined) {
    wsUrlPromise = (async () => {
      const chainEnv = await ensureChainEnv();
      let rpcUrl: string | undefined;
      let envConfig = await initEnvConfig();

      if (envConfig?.perEnvConfig?.[chainEnv]?.rpcWsUrl !== undefined) {
        const customRpcUrl = envConfig.perEnvConfig[chainEnv].rpcWsUrl;
        rpcUrl = customRpcUrl;
      } else if (chainEnv === "local") {
        rpcUrl = `wss://${CHAIN_RPC_CONTAINER_NAME}:${CHAIN_RPC_PORT}`;
      } else {
        rpcUrl = await password({
          message: `Enter private Websocket RPC URL to use with ${chainEnv} env`,
        });

        envConfig = await initNewEnvConfig();
        const perEnvConfig = envConfig.perEnvConfig ?? {};
        perEnvConfig[chainEnv] = perEnvConfig[chainEnv] ?? {};
        perEnvConfig[chainEnv].rpcWsUrl = rpcUrl;
        envConfig.perEnvConfig = perEnvConfig;
        await envConfig.$commit();
      }

      dbg(`wsUrl: ${rpcUrl}`);
      return rpcUrl;
    })();
  }

  return wsUrlPromise;
}

let ipfsGatewayPromise: Promise<string> | undefined;

const IPFS_GATEWAYS: Record<ChainENV, string> = {
  local: "https://ipfs-gateway.fluence.dev",
  testnet: "https://ipfs-gateway.fluence.dev",
  mainnet: "https://ipfs-gateway.fluence.dev",
  stage: "https://ipfs-gateway.fluence.dev",
};

export async function getIpfsGateway() {
  if (ipfsGatewayPromise === undefined) {
    ipfsGatewayPromise = (async () => {
      const chainEnv = await ensureChainEnv();
      let ipfsGateway = IPFS_GATEWAYS[chainEnv];
      const envConfig = await initEnvConfig();

      if (envConfig?.perEnvConfig?.[chainEnv]?.ipfsGateway !== undefined) {
        const customIpfsGateway = envConfig.perEnvConfig[chainEnv].ipfsGateway;

        commandObj.logToStderr(
          `Using custom IPFS Gateway: ${customIpfsGateway} from ${envConfig.$getPath()}`,
        );

        ipfsGateway = customIpfsGateway;
      }

      dbg(`ipfsGateway: ${ipfsGateway}`);
      return ipfsGateway;
    })();
  }

  return ipfsGatewayPromise;
}

let blockScoutUrlPromise:
  | Promise<
      | {
          blockExplorers: {
            default: { name: "Blockscout"; url: string; apiUrl: string };
          };
        }
      | Record<string, never>
    >
  | undefined;

/**
 * Returns blockExplorer config or empty object if env is local
 * cause we currently don't run Blockscout for local env
 */
export async function getBlockScoutUrl() {
  if (blockScoutUrlPromise === undefined) {
    blockScoutUrlPromise = (async () => {
      const chainEnv = await ensureChainEnv();

      if (chainEnv === "local") {
        return {};
      }

      const { BLOCK_SCOUT_URLS } = await import("@fluencelabs/deal-ts-clients");
      let blockScoutUrl: string = BLOCK_SCOUT_URLS[chainEnv];
      const envConfig = await initEnvConfig();

      if (envConfig?.perEnvConfig?.[chainEnv]?.blockScoutUrl !== undefined) {
        const customBlockScoutUrl =
          envConfig.perEnvConfig[chainEnv].blockScoutUrl;

        commandObj.logToStderr(
          `Using custom BlockScout URL: ${customBlockScoutUrl} from ${envConfig.$getPath()}`,
        );

        blockScoutUrl = customBlockScoutUrl;
      }

      dbg(`blockScoutUrl: ${blockScoutUrl}`);
      return {
        blockExplorers: {
          default: {
            name: "Blockscout",
            url: blockScoutUrl,
            apiUrl: `${blockScoutUrl}api`,
          },
        },
      };
    })();
  }

  return blockScoutUrlPromise;
}

let subgraphUrlPromise: Promise<string> | undefined;

export async function getSubgraphUrl() {
  if (subgraphUrlPromise === undefined) {
    subgraphUrlPromise = (async () => {
      const chainEnv = await ensureChainEnv();
      const { SUBGRAPH_URLS } = await import("@fluencelabs/deal-ts-clients");
      let subgraphUrl: string = SUBGRAPH_URLS[chainEnv];
      const envConfig = await initEnvConfig();

      if (envConfig?.perEnvConfig?.[chainEnv]?.subgraphUrl !== undefined) {
        const customSubgraphUrl = envConfig.perEnvConfig[chainEnv].subgraphUrl;

        commandObj.logToStderr(
          `Using custom Subgraph URL: ${customSubgraphUrl} from ${envConfig.$getPath()}`,
        );

        subgraphUrl = customSubgraphUrl;
      }

      dbg(`subgraphUrl: ${subgraphUrl}`);
      return subgraphUrl;
    })();
  }

  return subgraphUrlPromise;
}

let networkNamePromise: Promise<string> | undefined;

export async function getNetworkName() {
  if (networkNamePromise === undefined) {
    networkNamePromise = (async () => {
      const env = await ensureChainEnv();
      const networkName = `Fluence ${capitalize(env)}`;
      dbg(`networkName: ${networkName}`);
      return networkName;
    })();
  }

  return networkNamePromise;
}
