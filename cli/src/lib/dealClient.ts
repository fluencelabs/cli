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

import assert from "node:assert";

import type {
  DealClient,
  DealMatcherClient,
  DealExplorerClient,
} from "@fluencelabs/deal-ts-clients";
import type { DealCliClient } from "@fluencelabs/deal-ts-clients/dist/dealCliClient/dealCliClient.js";
import type {
  TypedContractMethod,
  StateMutability,
} from "@fluencelabs/deal-ts-clients/dist/typechain-types/common.d.ts";
import { color } from "@oclif/color";
import type {
  TransactionRequest,
  LogDescription,
  Provider,
  Signer,
  Wallet,
  ContractTransaction,
  TransactionReceipt,
} from "ethers";
import chunk from "lodash-es/chunk.js";
import stripAnsi from "strip-ansi";

import {
  CHAIN_URLS,
  type TransactionPayload,
  LOCAL_NET_DEFAULT_WALLET_KEY,
} from "../common.js";

import { chainFlags } from "./chainFlags.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { CLI_NAME_FULL, PRIV_KEY_FLAG_NAME } from "./const.js";
import { dbg } from "./dbg.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import { setTryTimeout, stringifyUnknown } from "./helpers/utils.js";
import { createTransaction, getAddressFromConnector } from "./server.js";

let provider: Provider | undefined = undefined;
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

let providerOrWallet: Provider | Wallet | undefined = undefined;

let dealClient: DealClient | undefined = undefined;

// only needed for 'proof' command so it's possible to use multiple wallets during one command execution
// normally, each command will use only one wallet
let dealClientPrivKey: string | undefined = undefined;

export async function getDealClient() {
  const privKey =
    chainFlags[PRIV_KEY_FLAG_NAME] === undefined &&
    (await ensureChainEnv()) === "local" &&
    !isInteractive
      ? LOCAL_NET_DEFAULT_WALLET_KEY
      : chainFlags[PRIV_KEY_FLAG_NAME];

  if (
    providerOrWallet === undefined ||
    dealClient === undefined ||
    dealClientPrivKey !== privKey
  ) {
    dealClientPrivKey = privKey;

    providerOrWallet = await (privKey === undefined
      ? ensureProvider()
      : getWallet(privKey));

    dealClient = await createDealClient(providerOrWallet);
  }

  return { dealClient, providerOrWallet };
}

export async function getSignerAddress() {
  const { providerOrWallet } = await getDealClient();

  return (
    "address" in providerOrWallet
      ? providerOrWallet.address
      : await getAddressFromConnector()
  ).toLowerCase();
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

let dealExplorerClient: DealExplorerClient | undefined = undefined;

export async function getDealExplorerClient() {
  if (provider === undefined) {
    provider = await ensureProvider();
  }

  if (dealExplorerClient === undefined) {
    const { DealExplorerClient } = await import("@fluencelabs/deal-ts-clients");
    const env = await ensureChainEnv();

    dealExplorerClient = await DealExplorerClient.create(
      env,
      undefined,
      provider,
    );
  }

  return dealExplorerClient;
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

async function createDealClient(signerOrProvider: Provider | Signer) {
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

export async function ensureProvider(): Promise<Provider> {
  if (provider === undefined) {
    const { ethers } = await import("ethers");
    const chainEnv = await ensureChainEnv();
    dbg(`Chain RPC ${CHAIN_URLS[chainEnv]}`);
    provider = new ethers.JsonRpcProvider(CHAIN_URLS[chainEnv]);
  }

  return provider;
}

async function getWallet(privKey: string): Promise<Wallet> {
  const { ethers } = await import("ethers");
  return new ethers.Wallet(privKey, await ensureProvider());
}

const DEFAULT_OVERRIDES: TransactionRequest = {
  maxPriorityFeePerGas: 0,
};

export async function sendRawTransaction(
  title: string,
  transactionRequest: TransactionRequest,
) {
  const debugInfo = methodCallToString([
    { name: "sendTransaction" },
    transactionRequest,
  ]);

  dbg(`sending raw transaction: ${debugInfo}`);

  const { providerOrWallet } = await getDealClient();

  let txHash: string;
  let txReceipt: TransactionReceipt | null;

  if (providerOrWallet.sendTransaction !== undefined) {
    const { tx, res } = await setTryTimeout(
      `executing ${color.yellow(title)}`,
      async function executingContractMethod() {
        const tx = await providerOrWallet.sendTransaction?.(transactionRequest);

        assert(
          tx !== undefined,
          "Unreachable. we checked sendTransaction exists",
        );

        const res = await tx.wait();
        return { tx, res };
      },
      (err) => {
        throw err;
      },
      1000 * 5, // 5 seconds
      1000,
      (err: unknown) => {
        return !(
          err instanceof Error &&
          [
            "data=null",
            "connection error",
            "connection closed",
            "Tendermint RPC error",
          ].some((msg) => {
            return err.message.includes(msg);
          })
        );
      },
    );

    txHash = tx.hash;
    txReceipt = res;
  } else {
    if (!isInteractive) {
      commandObj.error(
        `Please provide ${color.yellow(`--${PRIV_KEY_FLAG_NAME}`)} flag so you can sign transaction non-interactively`,
      );
    }

    ({ txHash } = await createTransaction((): Promise<TransactionPayload> => {
      return Promise.resolve<TransactionPayload>({
        title,
        debugInfo,
        name: "sendTransaction",
        transactionData: transactionRequest,
      });
    }));

    const { providerOrWallet } = await getDealClient();
    const provider = providerOrWallet.provider;
    assert(provider !== null, "Unreachable. Provider is null");
    txReceipt = await provider.getTransactionReceipt(txHash);
  }

  assert(
    txReceipt !== null,
    `wasn't able to find transaction receipt for 'sendTransaction'`,
  );

  assert(
    txReceipt.status === 1,
    `'sendTransaction' transaction failed with status 1`,
  );

  commandObj.logToStderr(
    `${color.yellow("sendTransaction")} transaction ${color.yellow(
      txHash,
    )} was mined successfully`,
  );

  return txReceipt;
}

async function doSign<
  A extends Array<unknown> = Array<unknown>,
  R = unknown,
  S extends Exclude<StateMutability, "view"> = "payable",
>(getTransaction: () => Promise<SignArgs<A, R, S>>) {
  const {
    title,
    method,
    args: originalArgs,
    validateAddress,
  } = await getTransaction();

  const overrides = originalArgs[originalArgs.length - 1];

  const hasOverrides =
    method.fragment.inputs.length === originalArgs.length - 1 &&
    typeof overrides === "object";

  // @ts-expect-error this probably impossible to type correctly with current TypeScript compiler
  const args: Parameters<TypedContractMethod<A, R, S>> = hasOverrides
    ? [...originalArgs.slice(0, -1), { ...DEFAULT_OVERRIDES, ...overrides }]
    : [...originalArgs, DEFAULT_OVERRIDES];

  const debugInfo =
    method.name === "multicall"
      ? batchTxMessage ??
        (() => {
          throw new Error(
            "Unreachable. batchTxMessage is supposed to be set up when creating multicall",
          );
        })()
      : methodCallToString([method, ...args]);

  dbg(
    method.name === "multicall"
      ? `${color.yellow("MULTICALL START")}:\n${debugInfo}\n${color.yellow("MULTICALL END")}`
      : `calling contract method: ${debugInfo}`,
  );

  const { providerOrWallet } = await getDealClient();

  let txHash: string;
  let txReceipt: TransactionReceipt | null;

  if (providerOrWallet.sendTransaction !== undefined) {
    const { tx, res } = await setTryTimeout(
      `executing ${color.yellow(title)} contract method`,
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
        return !(
          err instanceof Error &&
          [
            "data=null",
            "connection error",
            "connection closed",
            "Tendermint RPC error",
          ].some((msg) => {
            return err.message.includes(msg);
          })
        );
      },
    );

    txHash = tx.hash;
    txReceipt = res;
  } else {
    if (!isInteractive) {
      commandObj.error(
        `Please provide ${color.yellow(`--${PRIV_KEY_FLAG_NAME}`)} flag so you can sign transaction non-interactively`,
      );
    }

    ({ txHash } = await createTransaction(
      async (): Promise<TransactionPayload> => {
        const { title, method, args: originalArgs } = await getTransaction();

        // @ts-expect-error this probably impossible to type correctly with current TypeScript compiler
        const args: Parameters<TypedContractMethod<A, R, S>> = hasOverrides
          ? [
              ...originalArgs.slice(0, -1),
              { ...DEFAULT_OVERRIDES, ...overrides },
            ]
          : [...originalArgs, DEFAULT_OVERRIDES];

        return {
          title: stripAnsi(title),
          debugInfo,
          name: method.name,
          transactionData: await method.populateTransaction(...args),
        };
      },
      validateAddress,
    ));

    const { providerOrWallet } = await getDealClient();
    const provider = providerOrWallet.provider;
    assert(provider !== null, "Unreachable. Provider is null");
    txReceipt = await provider.getTransactionReceipt(txHash);
  }

  assert(
    txReceipt !== null,
    `wasn't able to find transaction receipt for '${method.name}'`,
  );

  assert(
    txReceipt.status === 1,
    `'${method.name}' transaction failed with status 1`,
  );

  commandObj.logToStderr(
    `${color.yellow(method.name)} transaction ${color.yellow(
      txHash,
    )} was mined successfully`,
  );

  return txReceipt;
}

export type ValidateAddress =
  | ((address: `0x${string}`) => never | Promise<void>)
  | undefined;

type SignArgs<
  A extends Array<unknown> = Array<unknown>,
  R = unknown,
  S extends Exclude<StateMutability, "view"> = "payable",
> = {
  title: string;
  method: TypedContractMethod<A, R, S>;
  args: Parameters<TypedContractMethod<A, R, S>>;
  validateAddress?: ValidateAddress;
};

export async function sign<
  A extends Array<unknown> = Array<unknown>,
  R = unknown,
  S extends Exclude<StateMutability, "view"> = "payable",
>(signArgs: SignArgs<A, R, S>) {
  return doSign(() => {
    return Promise.resolve(signArgs);
  });
}

export function populateTx<T extends unknown[]>(
  method: {
    populateTransaction: (...args: T) => Promise<ContractTransaction>;
    name: string;
  },
  ...args: T
): {
  populate: () => Promise<ContractTransaction>;
  debugInfo: [{ name: string }, ...unknown[]];
} {
  return {
    populate: () => {
      return method.populateTransaction(...args);
    },
    debugInfo: [method, ...args],
  };
}

export const BATCH_SIZE = 10;

let batchTxMessage: string | undefined;

export async function signBatch(
  title: string,
  populatedTxsWithDebugInfo: Array<ReturnType<typeof populateTx>>,
  validateAddress?: ValidateAddress,
) {
  const populatedTxsWithDebugInfoResolved = await Promise.all(
    populatedTxsWithDebugInfo.map(async ({ populate, debugInfo }) => {
      return {
        populated: await populate(),
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

  const populatedTxsChunked = chunk(populatedTxsWithDebugInfo, BATCH_SIZE);

  const { IMulticall__factory } = await import("@fluencelabs/deal-ts-clients");
  const { providerOrWallet } = await getDealClient();

  const { multicall } = IMulticall__factory.connect(
    firstAddr,
    providerOrWallet,
  );

  const receipts = [];

  for (const txs of populatedTxsChunked) {
    batchTxMessage = txs
      .map(({ debugInfo }) => {
        return methodCallToString(debugInfo);
      })
      .join("\n");

    receipts.push(
      await doSign(async () => {
        return {
          title: title,
          method: multicall,
          args: [
            await Promise.all(
              txs.map(async ({ populate }) => {
                return (await populate()).data;
              }),
            ),
          ],
          validateAddress,
        } as const;
      }),
    );
  }

  return receipts;
}

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
  txReceipt: TransactionReceipt;
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
  txReceipts: TransactionReceipt[];
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
