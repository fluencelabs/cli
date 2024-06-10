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

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
