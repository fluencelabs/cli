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

/* eslint-disable camelcase */

import assert from "node:assert";
import { URL } from "node:url";

import { color } from "@oclif/color";
import type { ethers } from "ethers";

import { commandObj } from "./commandObj.js";
import type { FluenceConfigReadonly } from "./configs/project/fluence.js";
import {
  DEAL_CONFIG,
  CLI_CONNECTOR_URL,
  DEAL_RPC_CONFIG,
  WC_PROJECT_ID,
  WC_METADATA,
  type ContractsENV,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  CLI_NAME,
  CONTRACTS_ENV_TO_CHAIN_ID,
} from "./const.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { resolveFluenceEnv } from "./multiaddres.js";

const WC_QUERY_PARAM_NAME = "wc";
const RELAY_QUERY_PARAM_NAME = "relay-protocol";
const KEY_QUERY_PARAM_NAME = "symKey";

export async function ensureChainNetwork(
  fluenceEnvFromFlags: string | undefined,
  maybeFluenceConfig: FluenceConfigReadonly | null,
): Promise<ContractsENV> {
  const fluenceEnv = await resolveFluenceEnv(fluenceEnvFromFlags);

  if (fluenceEnv !== "custom") {
    commandObj.logToStderr(
      `Using ${color.yellow(fluenceEnv)} environment to sign contracts`,
    );

    return fluenceEnv;
  }

  const customContractsEnv = maybeFluenceConfig?.customFluenceEnv?.contractsEnv;

  if (customContractsEnv === undefined) {
    commandObj.error(
      `${color.yellow("customFluenceEnv")} is not defined in ${color.yellow(
        maybeFluenceConfig?.$getPath() ?? FLUENCE_CONFIG_FULL_FILE_NAME,
      )}. Please make sure it's there or choose some other fluence environment using ${color.yellow(
        `${CLI_NAME} default env`,
      )}`,
    );
  }

  commandObj.logToStderr(
    `Using ${color.yellow(
      customContractsEnv,
    )} blockchain environment to sign contracts for ${color.yellow(
      fluenceEnv,
    )} fluence environment`,
  );

  return customContractsEnv;
}

export const getSigner = async (
  network: ContractsENV,
  privKey: string | undefined,
): Promise<ethers.Signer> => {
  return privKey === undefined
    ? getWalletConnectProvider(network)
    : getWallet(privKey, network);
};

async function getWalletConnectProvider(env: ContractsENV) {
  const { UniversalProvider } = await import(
    "@walletconnect/universal-provider"
  );

  const provider = await UniversalProvider.init({
    projectId: WC_PROJECT_ID,
    metadata: WC_METADATA,
  });

  provider.on("display_uri", (uri: string) => {
    const connectionStringUrl = new URL(uri);
    const wc = connectionStringUrl.pathname;

    const bridge = connectionStringUrl.searchParams.get(RELAY_QUERY_PARAM_NAME);

    assert(typeof bridge === "string");
    const key = connectionStringUrl.searchParams.get(KEY_QUERY_PARAM_NAME);
    assert(typeof key === "string");
    const url = new URL(CLI_CONNECTOR_URL);
    url.searchParams.set(WC_QUERY_PARAM_NAME, wc);
    url.searchParams.set(RELAY_QUERY_PARAM_NAME, bridge);
    url.searchParams.set(KEY_QUERY_PARAM_NAME, key);

    commandObj.logToStderr(
      `To approve transactions to your wallet using metamask, open the following url:\n\n${url.toString()}\n\nor go to ${CLI_CONNECTOR_URL} and enter the following connection string there:\n\n${uri}\n`,
    );
  });

  const session = await provider.connect({
    namespaces: {
      eip155: {
        methods: [
          "eth_sendTransaction",
          "eth_signTransaction",
          "eth_sign",
          "personal_sign",
          "eth_signTypedData",
        ],
        chains: [`eip155:${CONTRACTS_ENV_TO_CHAIN_ID[env]}`],
        events: ["chainChanged", "accountsChanged"],
        rpcMap: DEAL_RPC_CONFIG,
      },
    },
  });

  const walletAddress =
    session?.namespaces["eip155"]?.accounts[0]?.split(":")[2];

  if (walletAddress === undefined) {
    throw new Error("Wallet address is not defined");
  }

  stopSpinner(`\nWallet ${color.yellow(walletAddress)} connected`);

  const { ethers } = await import("ethers");
  return new ethers.BrowserProvider(provider).getSigner();
}

const getWallet = async (
  privKey: string,
  network: ContractsENV,
): Promise<ethers.Wallet> => {
  const { ethers } = await import("ethers");

  return new ethers.Wallet(
    privKey,
    new ethers.JsonRpcProvider(DEAL_CONFIG[network].url),
  );
};

export const waitTx = async (
  tx: ethers.ContractTransactionResponse,
): Promise<ethers.ContractTransactionReceipt> => {
  startSpinner("Waiting for transaction to be mined...");

  const res = await tx.wait();
  stopSpinner();

  assert(res !== null, "Transaction hash is not defined");
  assert(res.status === 1, "Transaction failed");

  return res;
};

export const promptConfirmTx = (privKey: string | undefined) => {
  if (privKey === undefined) {
    commandObj.logToStderr(`Confirm transaction in your wallet...`);
  }
};
