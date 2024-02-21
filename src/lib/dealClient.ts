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
import chunk from "lodash-es/chunk.js";

import { LOCAL_NET_DEFAULT_WALLET_KEY } from "./accounts.js";
import { chainFlags } from "./chainFlags.js";
import { commandObj } from "./commandObj.js";
import {
  DEAL_CONFIG,
  CLI_CONNECTOR_URL,
  DEAL_RPC_CONFIG,
  WC_PROJECT_ID,
  WC_METADATA,
  CONTRACTS_ENV_TO_CHAIN_ID,
  CLI_NAME_FULL,
  PRIV_KEY_FLAG_NAME,
} from "./const.js";
import { dbg } from "./dbg.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import { setTryTimeout, stringifyUnknown } from "./helpers/utils.js";

const WC_QUERY_PARAM_NAME = "wc";
const RELAY_QUERY_PARAM_NAME = "relay-protocol";
const KEY_QUERY_PARAM_NAME = "symKey";

let provider: ethers.Provider | undefined = undefined;
let readonlyDealClient: DealClient | undefined = undefined;

export async function getReadonlyDealClient() {
  if (provider === undefined) {
    provider = await ensureProvider();
  }

  if (readonlyDealClient === undefined) {
    readonlyDealClient = await createDealClient(provider);
  }

  return { readonlyDealClient, provider };
}

let signerOrWallet: ethers.JsonRpcSigner | ethers.Wallet | undefined =
  undefined;

let dealClient: DealClient | undefined = undefined;

// only needed for 'proof' command so it's possible to use multiple wallets during one command execution
// normally each command will use only one wallet
let dealClientPrivKey: string | undefined = undefined;

export async function getDealClient() {
  const chainEnv = await ensureChainEnv();

  const privKey =
    chainFlags[PRIV_KEY_FLAG_NAME] ??
    // use default wallet key for local network
    (chainEnv === "local" ? LOCAL_NET_DEFAULT_WALLET_KEY : undefined);

  if (
    signerOrWallet === undefined ||
    dealClient === undefined ||
    dealClientPrivKey !== privKey
  ) {
    dealClientPrivKey = privKey;

    signerOrWallet =
      privKey === undefined
        ? await getWalletConnectProvider()
        : await getWallet(privKey);

    dealClient = await createDealClient(signerOrWallet);
  }

  return { dealClient, signerOrWallet };
}

let dealMatcherClient: DealMatcherClient | undefined = undefined;

export async function getDealMatcherClient() {
  const { DealMatcherClient } = await import("@fluencelabs/deal-ts-clients");
  const chainEnv = await ensureChainEnv();

  if (dealMatcherClient === undefined) {
    dealMatcherClient = new DealMatcherClient(chainEnv);
  }

  return dealMatcherClient;
}

let dealExplorerClient: DealExplorerClient | undefined = undefined;

export async function getDealExplorerClient() {
  const { DealExplorerClient } = await import("@fluencelabs/deal-ts-clients");
  const chainEnv = await ensureChainEnv();

  if (dealExplorerClient === undefined) {
    dealExplorerClient = new DealExplorerClient(chainEnv);
  }

  return dealExplorerClient;
}

async function createDealClient(
  signerOrProvider: ethers.Provider | ethers.Signer,
) {
  const { DealClient } = await import("@fluencelabs/deal-ts-clients");
  const chainEnv = await ensureChainEnv();
  const client = new DealClient(signerOrProvider, chainEnv);

  await setTryTimeout(
    "check if blockchain client is connected",
    async () => {
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

export async function ensureProvider(): Promise<ethers.Provider> {
  const { ethers } = await import("ethers");
  const chainEnv = await ensureChainEnv();

  if (provider === undefined) {
    provider = new ethers.JsonRpcProvider(DEAL_CONFIG[chainEnv].url);
  }

  return provider;
}

async function getWalletConnectProvider() {
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

  const chainEnv = await ensureChainEnv();

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
        chains: [`eip155:${CONTRACTS_ENV_TO_CHAIN_ID[chainEnv]}`],
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

  const { ethers } = await import("ethers");
  return new ethers.BrowserProvider(provider).getSigner();
}

async function getWallet(privKey: string): Promise<ethers.Wallet> {
  const { ethers } = await import("ethers");
  return new ethers.Wallet(privKey, await ensureProvider());
}

export async function sign<T extends unknown[]>(
  method: (...args: T) => Promise<ethers.TransactionResponse>,
  ...args: T
) {
  if (
    chainFlags[PRIV_KEY_FLAG_NAME] === undefined &&
    (await ensureChainEnv()) !== "local"
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

  // const tx = await method(...args);
  // const res = await tx.wait();

  type TxType = Awaited<ReturnType<typeof method>>;
  let tx: TxType;
  let res: Awaited<ReturnType<TxType["wait"]>>;

  // at this moment there is this unknown bug that prevents some of the txs from running from the first try
  if (process.env.CI === "true") {
    ({ tx, res } = await setTryTimeout(
      `execute ${color.yellow(method.name)} blockchain method`,
      async function executingContractMethod() {
        const tx = await method(...args);
        const res = await tx.wait();
        return { tx, res };
      },
      (err) => {
        throw err;
      },
      1000 * 60 * 3,
    ));
  } else {
    tx = await method(...args);
    res = await tx.wait();
  }

  assert(res !== null, `'${method.name}' transaction hash is not defined`);
  assert(res.status === 1, `'${method.name}' transaction failed with status 1`);

  commandObj.logToStderr(
    `${color.yellow(method.name)} transaction ${color.yellow(
      tx.hash,
    )} was mined successfuly`,
  );

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

const BATCH_SIZE = 10;

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

  const data = chunk(
    populatedTxs.map(({ data }) => {
      return data;
    }),
    BATCH_SIZE,
  );

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

  const receipts = [];

  for (const d of data) {
    receipts.push(await sign(multicall, d));
  }

  return receipts;
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

type GetEventValueFromReceiptsArgs<T extends string, U extends Contract<T>> = {
  txReceipts: ethers.TransactionReceipt[];
  contract: U;
  eventName: T;
  value: string;
};

export function getEventValueFromReceipts<
  T extends string,
  U extends Contract<T>,
>({
  txReceipts,
  contract,
  eventName,
  value,
}: GetEventValueFromReceiptsArgs<T, U>) {
  const { topicHash } = contract.getEvent(eventName).fragment;

  const logs = txReceipts
    .map((txReceipt) => {
      return txReceipt.logs.find((log) => {
        return log.topics[0] === topicHash;
      });
    })
    .filter((log): log is NonNullable<typeof log> => {
      return log !== undefined;
    });

  assert(
    logs.length === 0,
    `Event '${eventName}' with hash '${topicHash}' not found in logs of the successful transaction. Try updating ${CLI_NAME_FULL} to the latest version`,
  );

  const res: unknown[] = logs.map((log): unknown => {
    return contract.interface
      .parseLog({
        data: log.data,
        topics: [...log.topics],
      })
      ?.args.getValue(value);
  });

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
