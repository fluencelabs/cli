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

import type { Contracts, Deployment } from "@fluencelabs/deal-ts-clients";
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
  BytesLike,
  Result,
} from "ethers";
import stripAnsi from "strip-ansi";

import {
  type TransactionPayload,
  jsonStringify,
  LOCAL_NET_DEFAULT_WALLET_KEY,
} from "../common.js";

import { getChainId, getNetworkName, getRpcUrl } from "./chain/chainConfig.js";
import { chainFlags } from "./chainFlags.js";
import { commandObj, isInteractive } from "./commandObj.js";
import { initEnvConfig } from "./configs/project/env/env.js";
import { CLI_NAME_FULL, PRIV_KEY_FLAG_NAME } from "./const.js";
import { dbg } from "./dbg.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import { setTryTimeout } from "./helpers/setTryTimeout.js";
import { stringifyUnknown } from "./helpers/stringifyUnknown.js";
import { createTransaction, getAddressFromConnector } from "./server.js";

let provider: Provider | undefined = undefined;
let readonlyContracts: Contracts | undefined = undefined;

export async function getReadonlyContracts() {
  if (provider === undefined) {
    provider = await ensureProvider();
  }

  if (readonlyContracts === undefined) {
    readonlyContracts = await createContracts(provider);
  }

  return { readonlyContracts, provider };
}

let providerOrWallet: Provider | Wallet | undefined = undefined;

let contracts: Contracts | undefined = undefined;

export async function getContracts() {
  const privKey =
    chainFlags[PRIV_KEY_FLAG_NAME] === undefined &&
    (await ensureChainEnv()) === "local" &&
    !isInteractive
      ? LOCAL_NET_DEFAULT_WALLET_KEY
      : chainFlags[PRIV_KEY_FLAG_NAME];

  if (providerOrWallet === undefined || contracts === undefined) {
    providerOrWallet = await (privKey === undefined
      ? ensureProvider()
      : getWallet(privKey));

    contracts = await createContracts(providerOrWallet);
  }

  return { contracts, providerOrWallet };
}

export async function getSignerAddress() {
  const { providerOrWallet } = await getContracts();

  return (
    "address" in providerOrWallet
      ? providerOrWallet.address
      : await getAddressFromConnector()
  ).toLowerCase();
}

let deployment: Promise<Deployment> | undefined = undefined;

export async function resolveDeployment() {
  if (deployment === undefined) {
    deployment = (async () => {
      const envConfig = await initEnvConfig();
      const { DEPLOYMENTS } = await import("@fluencelabs/deal-ts-clients");

      if (
        envConfig !== null &&
        envConfig.deployment !== undefined &&
        Object.keys(envConfig.deployment).length > 0
      ) {
        commandObj.logToStderr(
          `Using custom contract addresses ${JSON.stringify(envConfig.deployment)} from ${envConfig.$getPath()}`,
        );
      }

      return {
        ...DEPLOYMENTS[await ensureChainEnv()],
        ...envConfig?.deployment,
      };
    })();
  }

  return deployment;
}

async function createContracts(signerOrProvider: Provider | Signer) {
  const { Contracts } = await import("@fluencelabs/deal-ts-clients");
  const contracts = new Contracts(signerOrProvider, await resolveDeployment());

  await setTryTimeout(
    "check if blockchain client is connected",
    async () => {
      // By calling this method we ensure that the blockchain client is connected
      await contracts.diamond.minDealDepositedEpochs();
    },
    (err) => {
      commandObj.error(
        `Check if blockchain client is connected by running contracts.diamond.minDealDepositedEpochs() failed: ${stringifyUnknown(err)}`,
      );
    },
    1000 * 5, // 5 seconds
  );

  return contracts;
}

export async function ensureProvider(): Promise<Provider> {
  if (provider === undefined) {
    const { JsonRpcProvider } = await import("ethers");

    provider = new JsonRpcProvider(await getRpcUrl(), {
      chainId: await getChainId(),
      name: await getNetworkName(),
    });
  }

  return provider;
}

export async function getWallet(privKey: string): Promise<Wallet> {
  const { Wallet } = await import("ethers");
  return new Wallet(privKey, await ensureProvider());
}

const DEFAULT_OVERRIDES: TransactionRequest = {
  maxPriorityFeePerGas: 0,
};

export async function sendRawTransaction(
  title: string,
  transactionRequest: TransactionRequest,
  providerOrWallet?: Provider | Wallet,
) {
  const debugInfo = methodCallToString([
    { name: "sendTransaction" },
    transactionRequest,
  ]);

  dbg(`sending raw transaction: ${debugInfo}`);

  const providerOrWalletToUse =
    providerOrWallet ?? (await getContracts()).providerOrWallet;

  let txHash: string;
  let txReceipt: TransactionReceipt | null;

  if (providerOrWalletToUse.sendTransaction !== undefined) {
    const { tx, res } = await setTryTimeout(
      `execute ${color.yellow(title)}`,
      async function executingContractMethod() {
        const tx =
          await providerOrWalletToUse.sendTransaction?.(transactionRequest);

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

    const provider = providerOrWalletToUse.provider;
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
      ? (batchTxMessage ??
        (() => {
          throw new Error(
            "Unreachable. batchTxMessage is supposed to be set up when creating multicall",
          );
        })())
      : methodCallToString([method, ...args]);

  dbg(
    method.name === "multicall"
      ? `${color.yellow("MULTICALL START")}:\n${debugInfo}\n${color.yellow("MULTICALL END")}`
      : `calling contract method: ${debugInfo}`,
  );

  const { providerOrWallet } = await getContracts();

  let txHash: string;
  let txReceipt: TransactionReceipt | null;

  if (providerOrWallet.sendTransaction !== undefined) {
    const { tx, res } = await setTryTimeout(
      `execute ${color.yellow(title)} contract function`,
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

    const { providerOrWallet } = await getContracts();
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

let batchTxMessage: string | undefined;

export async function signBatch(
  title: string,
  populatedTxsWithDebugInfo: [
    ReturnType<typeof populateTx>,
    ...ReturnType<typeof populateTx>[],
  ],
  validateAddress?: ValidateAddress,
) {
  const [
    { populate: firstPopulate, debugInfo: firstDebugInfo },
    ...restPopulatedTxsWithDebugInfo
  ] = populatedTxsWithDebugInfo;

  const [
    {
      populated: { to: firstAddr },
    },
    ...restPopulatedTxs
  ] = await Promise.all([
    (async () => {
      return { populated: await firstPopulate(), debugInfo: firstDebugInfo };
    })(),
    ...restPopulatedTxsWithDebugInfo.map(async ({ populate, debugInfo }) => {
      return { populated: await populate(), debugInfo };
    }),
  ]);

  if (
    restPopulatedTxs.some(({ populated: { to } }) => {
      return to !== firstAddr;
    })
  ) {
    throw new Error("All transactions must be to the same address");
  }

  const { contracts } = await getContracts();
  const { multicall } = contracts.getMulticall(firstAddr);
  const receipts = [];
  let sliceIndexStart = 0;

  while (sliceIndexStart < populatedTxsWithDebugInfo.length) {
    const res = await guessTxSizeAndSign({
      sliceValuesToRegister(sliceIndex) {
        return populatedTxsWithDebugInfo.slice(
          sliceIndexStart,
          sliceIndexStart + sliceIndex,
        );
      },
      sliceIndex: populatedTxsWithDebugInfo.length - sliceIndexStart,
      method: multicall,
      validateAddress,
      async getArgs(valuesToRegister) {
        return [
          await Promise.all(
            valuesToRegister.map(async ({ populate }) => {
              return (await populate()).data;
            }),
          ),
        ];
      },
      getTitle({ valuesToRegister }) {
        batchTxMessage = valuesToRegister
          .map(({ debugInfo }) => {
            return methodCallToString(debugInfo);
          })
          .join("\n");

        return title;
      },
    });

    receipts.push(res.txReceipt);
    sliceIndexStart = sliceIndexStart + res.sliceIndex;
  }

  return receipts;
}

function methodCallToString([method, ...args]: [
  { name: string },
  ...unknown[],
]) {
  return `${method.name}(${jsonStringify(args).slice(1, -1)})`;
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

export type MulticallReadItem = {
  callData: BytesLike;
  decode: (returnData: string) => Result;
  target: string;
};

/**
 * There is no good way to type this function correctly, so you have to use validation or type-assertions when using it
 */
export async function multicallRead(
  multicallReadItems: MulticallReadItem[],
): Promise<unknown[]> {
  const { contracts } = await getContracts();

  const results = await contracts.multicall3.aggregate3.staticCall(
    multicallReadItems.map(({ callData, target }) => {
      return { callData, target, allowFailure: true };
    }),
  );

  return multicallReadItems.map(({ decode }, i): unknown => {
    const res = results[i];

    assert(
      res !== undefined,
      "Unreachable. For each call we must have a result",
    );

    return res.success ? decode(res.returnData)[0] : undefined;
  });
}

export async function guessTxSizeAndSign<
  T,
  A extends Array<unknown> = Array<unknown>,
  R = unknown,
  S extends Exclude<StateMutability, "view"> = "payable",
>({
  sliceValuesToRegister,
  sliceIndex: sliceIndexArg,
  getArgs,
  getTitle,
  ...signArgs
}: {
  sliceValuesToRegister: (sliceIndex: number) => Array<T>;
  sliceIndex: number;
} & Omit<SignArgs<A, R, S>, "args" | "title"> & {
    getArgs: (
      valuesToRegister: T[],
    ) =>
      | Parameters<TypedContractMethod<A, R, S>>
      | Promise<Parameters<TypedContractMethod<A, R, S>>>;
    getTitle: (arg: { valuesToRegister: T[]; sliceCount: number }) => string;
  }) {
  let valuesToRegister;
  let sliceIndex = sliceIndexArg;
  let isValidTx = false;
  const { providerOrWallet } = await getContracts();
  const address = await getSignerAddress();

  do {
    valuesToRegister = sliceValuesToRegister(sliceIndex);

    try {
      const populatedTx = await populateTx(
        signArgs.method,
        ...(await getArgs(valuesToRegister)),
      ).populate();

      populatedTx.from = address;
      await providerOrWallet.estimateGas(populatedTx);

      isValidTx = true;
    } catch (e) {
      sliceIndex = Math.floor(sliceIndex / 2);

      if (sliceIndex === 0) {
        throw e;
      }
    }
  } while (!isValidTx);

  const txReceipt = await sign({
    ...signArgs,
    title: getTitle({ sliceCount: sliceIndex, valuesToRegister }),
    args: await getArgs(valuesToRegister),
  });

  return {
    txReceipt,
    sliceIndex,
    registeredValues: valuesToRegister,
  };
}
