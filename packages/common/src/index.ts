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

import "@total-typescript/ts-reset";
import type { TransactionRequest } from "ethers";

export const CHAIN_IDS = {
  dar: 2358716091832359,
  stage: 3521768853336688,
  kras: 1622562509754216,
  local: 31337,
} as const satisfies Record<ChainENV, number>;

export type ChainId = (typeof CHAIN_IDS)[ChainENV];
export const isChainId = getIsUnion(Object.values(CHAIN_IDS));

export const ETH_API_PORT = "8545";

export const DEFAULT_PUBLIC_FLUENCE_ENV = "dar";
export const PUBLIC_FLUENCE_ENV = [
  DEFAULT_PUBLIC_FLUENCE_ENV,
  "kras",
  "stage",
] as const;
export type PublicFluenceEnv = (typeof PUBLIC_FLUENCE_ENV)[number];
export const isPublicFluenceEnv = getIsUnion(PUBLIC_FLUENCE_ENV);

export const CHAIN_ENV = [...PUBLIC_FLUENCE_ENV, "local"] as const;
export type ChainENV = (typeof CHAIN_ENV)[number];
export const isChainEnv = getIsUnion(CHAIN_ENV);

export const CHAIN_URLS_WITHOUT_LOCAL = {
  kras: "https://ipc.kras.fluence.dev",
  dar: "https://ipc.dar.fluence.dev",
  stage: "https://ipc.stage.fluence.dev",
} as const satisfies Record<Exclude<ChainENV, "local">, string>;

export const CHAIN_URLS = {
  ...CHAIN_URLS_WITHOUT_LOCAL,
  local: `http://127.0.0.1:${ETH_API_PORT}`,
} as const satisfies Record<ChainENV, string>;

export const BLOCK_SCOUT_URLS = {
  kras: "https://blockscout.kras.fluence.dev/",
  dar: "https://blockscout.dar.fluence.dev/",
  stage: "https://blockscout.stage.fluence.dev/",
} as const satisfies Record<Exclude<ChainENV, "local">, string>;

export type TransactionPayload = {
  name: string;
  debugInfo: string;
  transactionData: TransactionRequest;
};

export type CLIToConnectorMsg =
  | {
      tag: "address";
    }
  | {
      tag: "previewTransaction";
      payload: TransactionPayload;
    }
  | {
      tag: "sendTransaction";
      payload: TransactionPayload;
    }
  | {
      tag: "ping";
    }
  | {
      tag: "returnToCLI";
    };

export type CLIToConnectorFullMsg = {
  chainId: ChainId;
  msg: CLIToConnectorMsg;
};

export type ConnectorToCLIMessageAddress = {
  tag: "address";
  address: string;
};

export type ConnectorToCLIMessageTransactionSuccess = {
  tag: "transactionSuccess";
  txHash: string;
};

export type ConnectorToCLIMessageSendTransaction = {
  tag: "sendTransaction";
};

export type ConnectorToCLIMessage =
  | ConnectorToCLIMessageAddress
  | ConnectorToCLIMessageTransactionSuccess
  | ConnectorToCLIMessageSendTransaction;

/**
 * Returns a type guard (https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates)
 * that you can use to find out if unknown is a union
 * @example
 * const isABC = getIsUnion(['a', 'b', 'c'])
 *
 * if (isABC(unknown)) {
 *   unknown // 'a' | 'b' | 'c'
 * }
 * @param array ReadonlyArray\<T extends string\>
 * @returns (unknown: unknown) => unknown is Array\<T\>[number]
 */
export function getIsUnion<T>(
  array: ReadonlyArray<T>,
): (unknown: unknown) => unknown is Array<T>[number] {
  return (unknown: unknown): unknown is Array<T>[number] => {
    return array.some((v): boolean => {
      return v === unknown;
    });
  };
}

const UINT8_ARRAY_PREFIX = "$$Uint8Array:";
const BIGINT_PREFIX = "$$BigInt:";

export function jsonStringify(unknown: unknown, noSpace = false): string {
  return JSON.stringify(
    unknown,
    (_key, value: unknown) => {
      if (value instanceof Uint8Array) {
        return `${UINT8_ARRAY_PREFIX}${JSON.stringify([...value])}`;
      }

      if (typeof value === "bigint") {
        // eslint-disable-next-line no-restricted-syntax
        return `${BIGINT_PREFIX}${value.toString()}`;
      }

      if (typeof value === "function") {
        return undefined;
      }

      return value;
    },
    noSpace ? undefined : 2,
  );
}

export function jsonReviver(_key: string, value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  if (value.startsWith(UINT8_ARRAY_PREFIX)) {
    // @ts-expect-error since we created it in the first place it has to be valid
    return new Uint8Array(JSON.parse(value.slice(UINT8_ARRAY_PREFIX.length)));
  }

  if (value.startsWith(BIGINT_PREFIX)) {
    return BigInt(value.slice(BIGINT_PREFIX.length));
  }

  return value;
}

export function jsonParse(string: string): unknown {
  return JSON.parse(string, jsonReviver);
}

export type Account = {
  address: string;
  privateKey: string;
};

export const LOCAL_NET_DEFAULT_WALLET_KEY =
  "0x2d37ee7f23fe2d916d57857b095426b54fed24840c3f61097c8fe547f3659156";

export const LOCAL_NET_DEFAULT_ACCOUNTS: Account[] = [
  {
    address: "0x96a609941fa20561B8Cf1DA7557549C29328Bf16",
    privateKey: LOCAL_NET_DEFAULT_WALLET_KEY,
  },
  {
    address: "0xf532b6512897cE489A239bB6F961BA45686220cc",
    privateKey:
      "0xf52980ab2a7f919b8d6fda7cae4a0b68d92516b32e6d1661db105e2f9962e42c",
  },
  {
    address: "0xDc0c66e89Ade8424C37B0B8cBF3d99FE94136536",
    privateKey:
      "0x66b2c5bf0b3834fbeb789511c29cecdbfa1f4c7a3f8ebb64f70bf1260bbf5950",
  },
  {
    address: "0x0dF140a5d5b862816eAb51e1252F38ee23373c64",
    privateKey:
      "0x73f59f92d583b4ca0da78db591c92ea72363345618caf56d58864295c86e8fda",
  },
];

export const LOCAL_NET_WALLET_KEYS = LOCAL_NET_DEFAULT_ACCOUNTS.map(
  ({ privateKey }) => {
    return privateKey;
  },
);
