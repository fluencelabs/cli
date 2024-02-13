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

import type {
  DealClient,
  DealMatcherClient,
  DealExplorerClient,
} from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import type { ethers, LogDescription } from "ethers";

import { LOCAL_NET_DEFAULT_WALLET_KEY } from "./accounts.js";
import { commandObj } from "./commandObj.js";
import { envConfig } from "./configs/globalConfigs.js";
import {
  DEAL_CONFIG,
  CLI_CONNECTOR_URL,
  DEAL_RPC_CONFIG,
  WC_PROJECT_ID,
  WC_METADATA,
  type ContractsENV,
  CONTRACTS_ENV_TO_CHAIN_ID,
  CLI_NAME_FULL,
  PRIV_KEY_FLAG_NAME,
} from "./const.js";
import { dbg } from "./dbg.js";
import { ensureChainNetwork } from "./ensureChainNetwork.js";
import { startSpinner, stopSpinner } from "./helpers/spinner.js";
import { setTryTimeout, stringifyUnknown } from "./helpers/utils.js";

const WC_QUERY_PARAM_NAME = "wc";
const RELAY_QUERY_PARAM_NAME = "relay-protocol";
const KEY_QUERY_PARAM_NAME = "symKey";

export type DealClientFlags = {
  env?: string | undefined;
  [PRIV_KEY_FLAG_NAME]?: string | undefined;
};

let dealClientFlags: DealClientFlags = {};

export function setDealClientFlags(flags: DealClientFlags) {
  dealClientFlags = flags;
}

let provider: ethers.Provider | undefined = undefined;
let readonlyDealClient: DealClient | undefined = undefined;

export async function getReadonlyDealClient() {
  const { env: envFromFlags } = dealClientFlags;
  const env = await ensureChainNetwork(envFromFlags);

  if (provider === undefined) {
    provider = await ensureProvider(env);
  }

  if (readonlyDealClient === undefined) {
    readonlyDealClient = await createDealClient(provider, env);
  }

  return { readonlyDealClient, provider };
}

let signerOrWallet: ethers.JsonRpcSigner | ethers.Wallet | undefined =
  undefined;

let dealClient: DealClient | undefined = undefined;

export async function getDealClient() {
  const { env: envFromFlags } = dealClientFlags;
  const env = await ensureChainNetwork(envFromFlags);

  const privKey =
    dealClientFlags[PRIV_KEY_FLAG_NAME] ??
    // use default wallet key for local network
    (env === "local" ? LOCAL_NET_DEFAULT_WALLET_KEY : undefined);

  if (signerOrWallet === undefined || dealClient === undefined) {
    signerOrWallet =
      privKey === undefined
        ? await getWalletConnectProvider(env)
        : await getWallet(privKey, env);

    dealClient = await createDealClient(signerOrWallet, env);
  }

  return { dealClient, signerOrWallet };
}

let dealMatcherClient: DealMatcherClient | undefined = undefined;

export async function getDealMatcherClient() {
  const { env: envFromFlags } = dealClientFlags;
  const env = await ensureChainNetwork(envFromFlags);
  const { DealMatcherClient } = await import("@fluencelabs/deal-ts-clients");

  if (dealMatcherClient === undefined) {
    dealMatcherClient = new DealMatcherClient(env);
  }

  return dealMatcherClient;
}

let dealExplorerClient: DealExplorerClient | undefined = undefined;

export async function getDealExplorerClient() {
  const { env: envFromFlags } = dealClientFlags;
  const env = await ensureChainNetwork(envFromFlags);
  const { DealExplorerClient } = await import("@fluencelabs/deal-ts-clients");

  if (dealExplorerClient === undefined) {
    dealExplorerClient = new DealExplorerClient(env);
  }

  return dealExplorerClient;
}

async function createDealClient(
  signerOrProvider: ethers.Provider | ethers.Signer,
  env: ContractsENV,
) {
  const { DealClient } = await import("@fluencelabs/deal-ts-clients");
  const client = new DealClient(signerOrProvider, env);

  await setTryTimeout(
    async function checkIfBlockChainClientIsConnected() {
      const core = await client.getCore();
      // By calling this method we ensure that the blockchain client is connected
      await core.minDealDepositedEpoches();
    },
    (err) => {
      throw new Error(stringifyUnknown(err));
    },
    1000 * 60 * 5,
  );

  return client;
}

export async function ensureProvider(
  env: ContractsENV,
): Promise<ethers.Provider> {
  const { ethers } = await import("ethers");

  if (provider === undefined) {
    provider = new ethers.JsonRpcProvider(DEAL_CONFIG[env].url);
  }

  return provider;
}

async function getWalletConnectProvider(contractsENV: ContractsENV) {
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
        chains: [`eip155:${CONTRACTS_ENV_TO_CHAIN_ID[contractsENV]}`],
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

async function getWallet(
  privKey: string,
  contractsENV: ContractsENV,
): Promise<ethers.Wallet> {
  const { ethers } = await import("ethers");
  return new ethers.Wallet(privKey, await ensureProvider(contractsENV));
}

export async function sign<T extends unknown[]>(
  method: (...args: T) => Promise<ethers.TransactionResponse>,
  ...args: T
) {
  if (
    dealClientFlags[PRIV_KEY_FLAG_NAME] === undefined &&
    envConfig?.fluenceEnv !== "local"
  ) {
    commandObj.logToStderr(
      `Confirm ${color.yellow(method.name)} transaction in your wallet...`,
    );
  }

  if (method.name !== "multicall") {
    const debugInfo = `calling contract method: ${methodCallToString([
      method,
      ...args,
    ])}`;

    dbg(debugInfo);
  }

  const tx = await method(...args);

  startSpinner(
    `Waiting for ${color.yellow(method.name)} transaction ${color.yellow(
      tx.hash,
    )} to be mined`,
  );

  const res = await tx.wait();
  stopSpinner();
  assert(res !== null, `'${method.name}' transaction hash is not defined`);
  assert(res.status === 1, `'${method.name}' transaction failed with status 1`);
  return res;
}

export type CallsToBatch<T extends Array<unknown>> = Array<
  [
    {
      populateTransaction: (...args: T) => Promise<ethers.ContractTransaction>;
      name: string;
    },
    ...T,
  ]
>;

export async function signBatch<T extends Array<unknown>>(
  callsToBatch: CallsToBatch<T>,
) {
  const populatedTxs = await Promise.all(
    callsToBatch.map(([method, ...args]) => {
      return method.populateTransaction(...args);
    }),
  );

  const [{ to: firstAddr } = { to: undefined }, ...restPopulatedTxs] =
    populatedTxs;

  if (firstAddr === undefined) {
    // if populatedTxsPromises is an empty array - do nothing
    return;
  }

  if (
    restPopulatedTxs.some(({ to }) => {
      return to !== firstAddr;
    })
  ) {
    throw new Error("All transactions must be to the same address");
  }

  const data = populatedTxs.map(({ data }) => {
    return data;
  });

  const { Multicall__factory } = await import("@fluencelabs/deal-ts-clients");
  const { signerOrWallet } = await getDealClient();
  const { multicall } = Multicall__factory.connect(firstAddr, signerOrWallet);

  dbg(
    `${color.yellow("MULTICALL START")}:\n${callsToBatch
      .map(([method, ...args]) => {
        return methodCallToString([method, ...args]);
      })
      .join("\n")}\n${color.yellow("MULTICALL END")}`,
  );

  return sign(multicall, data);
}

// eslint-disable-next-line @typescript-eslint/ban-types
function methodCallToString([method, ...args]: [
  { name: string },
  ...unknown[],
]) {
  return `${method.name}(${stringifyUnknown(args).slice(1, -1)})`;
}

type Contract<T> = {
  getEvent(name: T): {
    fragment: { topicHash: string };
  };
  interface: {
    parseLog(log: { topics: string[]; data: string }): LogDescription | null;
  };
};

type GetEventValueArgs<T extends string, U extends Contract<T>> = {
  txReceipt: ethers.TransactionReceipt;
  contract: U;
  eventName: T;
  value: string;
};

export function getEventValue<T extends string, U extends Contract<T>>({
  txReceipt,
  contract,
  eventName,
  value,
}: GetEventValueArgs<T, U>) {
  const { topicHash } = contract.getEvent(eventName).fragment;

  const log = txReceipt.logs.find((log) => {
    return log.topics[0] === topicHash;
  });

  assert(
    log !== undefined,
    `Event '${eventName}' with hash '${topicHash}' not found in logs of the successful transaction. Try updating ${CLI_NAME_FULL} to the latest version`,
  );

  const res: unknown = contract.interface
    .parseLog({
      data: log.data,
      topics: [...log.topics],
    })
    ?.args.getValue(value);

  return res;
}

export function getEventValues<T extends string, U extends Contract<T>>({
  txReceipt,
  contract,
  eventName,
  value,
}: GetEventValueArgs<T, U>) {
  const { topicHash } = contract.getEvent(eventName).fragment;

  const logs = txReceipt.logs.filter((log) => {
    return log.topics[0] === topicHash;
  });

  assert(
    logs.length !== 0,
    `Events '${eventName}' with hash '${topicHash}' not found in logs of the successful transaction. Try updating ${CLI_NAME_FULL} to the latest version`,
  );

  return logs.map((log) => {
    const res: unknown = contract.interface
      .parseLog({
        data: log.data,
        topics: [...log.topics],
      })
      ?.args.getValue(value);

    return res;
  });
}