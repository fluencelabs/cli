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

import "@rainbow-me/rainbowkit/styles.css";

import { Buffer } from "buffer";

import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { CLIToConnectorFullMsg } from "@repo/common";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import React from "react";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider, deepEqual } from "wagmi";

import { App } from "./App.jsx";
import "@total-typescript/ts-reset";
import "./index.css";

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();
const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

export function AppWrapper() {
  const [chain, setChain] = useState<
    CLIToConnectorFullMsg["chain"] | undefined
  >(undefined);

  useEffect(() => {
    if (chain !== undefined) {
      return;
    }

    const eventSource = new EventSource("/events");

    eventSource.onmessage = ({ data }) => {
      // We are sure CLI returns what we expect so there is no need to validate
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const { chain: chainFromCLI } = JSON.parse(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        data as string,
      ) as CLIToConnectorFullMsg;

      if (!deepEqual(chain, chainFromCLI)) {
        setChain(chainFromCLI);
      }
    };
  }, [chain, setChain]);

  if (chain === undefined) {
    return;
  }

  const config = getDefaultConfig({
    appName: "Fluence CLI Connector",
    projectId: "YOUR_PROJECT_ID",
    chains: [
      {
        ...chain,
        nativeCurrency: {
          decimals: 18,
          name: "Fluence",
          symbol: chain.name === "Fluence Mainnet" ? "FLT" : "tFLT",
        },
        testnet: chain.name !== "Fluence Mainnet",
      },
    ],
  });

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={chain.id}>
          <App chain={chain} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppWrapper />
  </React.StrictMode>,
);
