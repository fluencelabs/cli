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

import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { ChainId, CLIToConnectorFullMsg, jsonParse } from "@repo/common";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import React from "react";
import { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";

import { App } from "./App.jsx";
import { config } from "./wagmi.js";
import "@total-typescript/ts-reset";
import "./index.css";

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();
const root = document.getElementById("root");

if (root === null) {
  throw new Error("Root element not found");
}

export function AppWrapper() {
  const [chainId, setChainId] = useState<ChainId | undefined>(undefined);

  useEffect(() => {
    if (chainId !== undefined) {
      return;
    }

    const eventSource = new EventSource("/events");

    eventSource.onmessage = ({ data }) => {
      // We are sure CLI returns what we expect so there is no need to validate
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const { chainId: chainIdFromCLI } = jsonParse(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        data as string,
      ) as CLIToConnectorFullMsg;

      setChainId(chainIdFromCLI);
      eventSource.close();
    };
  }, [chainId, setChainId]);

  if (chainId === undefined) {
    return;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={chainId}>
          <App chainId={chainId} setChainId={setChainId} />
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
