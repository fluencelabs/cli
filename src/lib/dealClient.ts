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
} from "@fluencelabs/deal-ts-clients";
import type { DealCliClient } from "@fluencelabs/deal-ts-clients/dist/dealCliClient/dealCliClient.js";
import type {
  TypedContractMethod,
  StateMutability,
} from "@fluencelabs/deal-ts-clients/dist/typechain-types/common.d.ts";
import { color } from "@oclif/color";
import type { ethers, LogDescription } from "ethers";
import type { TransactionRequest } from "ethers";
import chunk from "lodash-es/chunk.js";

import { LOCAL_NET_DEFAULT_WALLET_KEY } from "./accounts.js";
import { getChainId } from "./chain/chainId.js";
import { chainFlags } from "./chainFlags.js";
import { commandObj } from "./commandObj.js";
import {
  CHAIN_URLS,
  CLI_CONNECTOR_URL,
  WC_PROJECT_ID,
  WC_METADATA,
  CLI_NAME_FULL,
  PRIV_KEY_FLAG_NAME,
} from "./const.js";
import { dbg } from "./dbg.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import { numToStr, urlToStr } from "./helpers/typesafeStringify.js";
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

  return {
    readonlyDealClient,
    provider,
  };
}

let signerOrWallet: ethers.JsonRpcSigner | ethers.Wallet | undefined =
  undefined;

let dealClient: DealClient | undefined = undefined;

// only needed for 'proof' command so it's possible to use multiple wallets during one command execution
// normally, each command will use only one wallet
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

    signerOrWallet = await (privKey === undefined
      ? getWalletConnectProvider()
      : getWallet(privKey));

    dealClient = await createDealClient(signerOrWallet);
  }

  return { dealClient, signerOrWallet };
}

let dealMatcherClient: DealMatcherClient | undefined = undefined;

export async function getDealMatcherClient() {
  if (dealMatcherClient === undefined) {
    const { DealMatcherClient } = await import("@fluencelabs/deal-ts-clients");
    const env = await ensureChainEnv();
    dealMatcherClient = new DealMatcherClient(env);
  }

  return dealMatcherClient;
}

let dealCliClient: DealCliClient | undefined = undefined;

export async function getDealCliClient() {
  if (dealCliClient === undefined) {
    const { DealCliClient } = await import("@fluencelabs/deal-ts-clients");
    const env = await ensureChainEnv();
    dealCliClient = new DealCliClient(env);
  }

  return dealCliClient;
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
      const core = client.getCore();
      // By calling this method we ensure that the blockchain client is connected
      await core.minDealDepositedEpochs();
    },
    (err) => {
      commandObj.error(
        `Check if blockchain client is connected by running core.minDealDepositedEpochs() failed: ${stringifyUnknown(err)}`,
      );
    },
    1000 * 5, // 5 seconds
  );

  return client;
}

export async function ensureProvider(): Promise<ethers.Provider> {
  if (provider === undefined) {
    const { ethers } = await import("ethers");
    const chainEnv = await ensureChainEnv();
    provider = new ethers.JsonRpcProvider(CHAIN_URLS[chainEnv]);
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
      `To continue, please connect your wallet using metamask by opening the following url:\n\n${urlToStr(url)}\n\nor go to ${CLI_CONNECTOR_URL} and enter the following connection string there:\n\n${uri}\n`,
    );
  });

  const chainEnv = await ensureChainEnv();
  const chainId = await getChainId();

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
        chains: [`eip155:${numToStr(chainId)}`],
        events: ["chainChanged", "accountsChanged"],
        rpcMap: { [chainId]: CHAIN_URLS[chainEnv] },
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

const DEFAULT_OVERRIDES: TransactionRequest = {
  maxPriorityFeePerGas: 0,
};

export async function sign<
  A extends Array<unknown> = Array<unknown>,
  R = unknown,
  S extends Exclude<StateMutability, "view"> = "payable",
>(
  method: TypedContractMethod<A, R, S>,
  ...originalArgs: Parameters<TypedContractMethod<A, R, S>>
) {
  const overrides = originalArgs[originalArgs.length - 1];

  const hasOverrides =
    method.fragment.inputs.length === originalArgs.length - 1 &&
    typeof overrides === "object";

  // @ts-expect-error this probably impossible to type correctly with current TypeScript compiler
  const args: Parameters<TypedContractMethod<A, R, S>> = hasOverrides
    ? [...originalArgs.slice(0, -1), { ...DEFAULT_OVERRIDES, ...overrides }]
    : [...originalArgs, DEFAULT_OVERRIDES];

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

  const { tx, res } = await setTryTimeout(
    `execute ${color.yellow(method.name)} blockchain method`,
    async function executingContractMethod() {
      const tx = await method(...args);
      const res = await tx.wait();
      return { tx, res };
    },
    (err) => {
      throw err;
    },
    1000 * 5, // 5 seconds
    1000,
    (err: unknown) => {
      // only retry data=null errors
      return !(
        err instanceof Error &&
        (err.message.includes("data=null") ||
          err.message.includes("connection error"))
      );
    },
  );

  assert(res !== null, `'${method.name}' transaction hash is not defined`);
  assert(res.status === 1, `'${method.name}' transaction failed with status 1`);

  commandObj.logToStderr(
    `${color.yellow(method.name)} transaction ${color.yellow(
      tx.hash,
    )} was mined successfully`,
  );

  return res;
}

export function populate<T extends unknown[]>(
  method: {
    populateTransaction: (...args: T) => Promise<ethers.ContractTransaction>;
    name: string;
  },
  ...args: T
): {
  populated: Promise<ethers.ContractTransaction>;
  debugInfo: [{ name: string }, ...unknown[]];
} {
  return {
    populated: method.populateTransaction(...args),
    debugInfo: [method, ...args],
  };
}

const BATCH_SIZE = 10;

export async function signBatch(
  populatedTxsWithDebugInfo: Array<ReturnType<typeof populate>>,
) {
  const populatedTxsWithDebugInfoResolved = await Promise.all(
    populatedTxsWithDebugInfo.map(async ({ populated, debugInfo }) => {
      return {
        populated: await populated,
        debugInfo,
      };
    }),
  );

  const [firstPopulatedTx, ...restPopulatedTxs] =
    populatedTxsWithDebugInfoResolved;

  const firstAddr = firstPopulatedTx?.populated.to;

  if (firstAddr === undefined) {
    // if populatedTxsPromises is an empty array - do nothing
    return;
  }

  if (
    restPopulatedTxs.some(({ populated: { to } }) => {
      return to !== firstAddr;
    })
  ) {
    throw new Error("All transactions must be to the same address");
  }

  const populatedTxsChunked = chunk(
    populatedTxsWithDebugInfoResolved,
    BATCH_SIZE,
  );

  const { Multicall__factory } = await import("@fluencelabs/deal-ts-clients");
  const { signerOrWallet } = await getDealClient();
  const { multicall } = Multicall__factory.connect(firstAddr, signerOrWallet);
  const receipts = [];

  for (const txs of populatedTxsChunked) {
    dbg(
      `${color.yellow("MULTICALL START")}:\n${txs
        .map(({ debugInfo }) => {
          return methodCallToString(debugInfo);
        })
        .join("\n")}\n${color.yellow("MULTICALL END")}`,
    );

    receipts.push(
      await sign(
        multicall,
        txs.map(({ populated: { data } }) => {
          return data;
        }),
      ),
    );
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
