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

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { CHAIN_IDS, CHAIN_URLS, BLOCK_SCOUT_URLS } from "@repo/common";

export const config = getDefaultConfig({
  appName: "Fluence CLI Connector",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    {
      id: CHAIN_IDS.kras,
      name: "kras",
      nativeCurrency: {
        decimals: 18,
        name: "Fluence",
        symbol: "FLT",
      },
      rpcUrls: {
        default: { http: [CHAIN_URLS.kras] },
      },
      blockExplorers: {
        default: {
          name: "BlockScout",
          url: BLOCK_SCOUT_URLS.kras,
        },
      },
    },
    {
      id: CHAIN_IDS.dar,
      name: "dar",
      nativeCurrency: {
        decimals: 18,
        name: "Fluence",
        symbol: "tFLT",
      },
      rpcUrls: {
        default: { http: [CHAIN_URLS.dar] },
      },
      blockExplorers: {
        default: {
          name: "BlockScout",
          url: BLOCK_SCOUT_URLS.dar,
        },
      },
      testnet: true,
    },
    {
      id: CHAIN_IDS.stage,
      name: "stage",
      nativeCurrency: {
        decimals: 18,
        name: "Fluence",
        symbol: "tFLT",
      },
      rpcUrls: {
        default: { http: [CHAIN_URLS.stage] },
      },
      blockExplorers: {
        default: {
          name: "BlockScout",
          url: BLOCK_SCOUT_URLS.stage,
        },
      },
      testnet: true,
    },
    {
      id: CHAIN_IDS.local,
      name: "local",
      nativeCurrency: {
        decimals: 18,
        name: "Fluence",
        symbol: "tFLT",
      },
      rpcUrls: {
        default: { http: [CHAIN_URLS.local] },
      },
      testnet: true,
    },
  ],
});
