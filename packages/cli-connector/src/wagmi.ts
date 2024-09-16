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
import { CHAIN_IDS, CHAIN_URLS } from "@repo/common";
import { fluence, fluenceStage, fluenceTestnet } from "viem/chains";

export const config = getDefaultConfig({
  appName: "Fluence CLI Connector",
  projectId: "YOUR_PROJECT_ID",
  chains: [
    fluenceStage,
    fluenceTestnet,
    fluence,
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
