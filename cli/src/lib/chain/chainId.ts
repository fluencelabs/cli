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

import { commandObj } from "../commandObj.js";
import { envConfig } from "../configs/globalConfigs.js";
import { dbg } from "../dbg.js";
import { ensureChainEnv } from "../ensureChainNetwork.js";
import { numToStr } from "../helpers/typesafeStringify.js";

let chainIdPromise: Promise<number> | undefined;

export async function getChainId() {
  if (chainIdPromise === undefined) {
    chainIdPromise = (async () => {
      const chainEnv = await ensureChainEnv();
      const { CHAIN_IDS } = await import("@fluencelabs/deal-ts-clients");
      let chainId: number = CHAIN_IDS[chainEnv];

      if (envConfig?.chainId !== undefined) {
        commandObj.logToStderr(
          `Using custom chain ID: ${numToStr(envConfig.chainId)} from ${envConfig.$getPath()}`,
        );

        chainId = envConfig.chainId;
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
      const { RPC_URLS } = await import("@fluencelabs/deal-ts-clients");
      let rpcUrl: string = RPC_URLS[chainEnv];

      if (envConfig?.rpcUrl !== undefined) {
        commandObj.logToStderr(
          `Using custom RPC URL: ${envConfig.rpcUrl} from ${envConfig.$getPath()}`,
        );

        rpcUrl = envConfig.rpcUrl;
      }

      dbg(`rpcUrl: ${rpcUrl}`);
      return rpcUrl;
    })();
  }

  return rpcUrlPromise;
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

export async function getBlockScoutUrl() {
  if (blockScoutUrlPromise === undefined) {
    blockScoutUrlPromise = (async () => {
      const chainEnv = await ensureChainEnv();

      if (chainEnv === "local") {
        return {};
      }

      const { BLOCK_SCOUT_URLS } = await import("@fluencelabs/deal-ts-clients");
      let blockScoutUrl: string = BLOCK_SCOUT_URLS[chainEnv];

      if (envConfig?.blockScoutUrl !== undefined) {
        commandObj.logToStderr(
          `Using custom BlockScout URL: ${envConfig.blockScoutUrl} from ${envConfig.$getPath()}`,
        );

        blockScoutUrl = envConfig.blockScoutUrl;
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

      if (envConfig?.subgraphUrl !== undefined) {
        commandObj.logToStderr(
          `Using custom Subgraph URL: ${envConfig.subgraphUrl} from ${envConfig.$getPath()}`,
        );

        subgraphUrl = envConfig.subgraphUrl;
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
