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

import "@total-typescript/ts-reset";
import type { TransactionRequest } from "ethers";

export const CHAIN_IDS = {
  dar: 52164803,
  stage: 123420000220,
  kras: 9999999,
  local: 31337,
} as const satisfies Record<ChainENV, number>;

export type ChainId = (typeof CHAIN_IDS)[ChainENV];
export const isChainId = getIsUnion(Object.values(CHAIN_IDS));

export const CHAIN_RPC_PORT = "8545";

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
  kras: "https://rpc.mainnet.fluence.dev",
  dar: "https://rpc.testnet.fluence.dev",
  stage: "https://rpc.stage.fluence.dev",
} as const satisfies Record<Exclude<ChainENV, "local">, string>;

export const CHAIN_URLS = {
  ...CHAIN_URLS_WITHOUT_LOCAL,
  local: `http://127.0.0.1:${CHAIN_RPC_PORT}`,
} as const satisfies Record<ChainENV, string>;

export const BLOCK_SCOUT_URLS = {
  kras: "https://blockscout.kras.fluence.dev/",
  dar: "https://blockscout.testnet.fluence.dev/",
  stage: "https://blockscout.stage.fluence.dev/",
} as const satisfies Record<Exclude<ChainENV, "local">, string>;

export type TransactionPayload = {
  title: string;
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
      addressUsedByCLI: string | null;
      CLIVersion: string;
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
  address: `0x${string}`;
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

export function bufferToHex(buffer: Buffer): string {
  // eslint-disable-next-line no-restricted-syntax
  return buffer.toString("hex");
}

export function uint8ArrayToHex(uint8Array: Uint8Array): string {
  return `0x${bufferToHex(Buffer.from(uint8Array))}`;
}

export function jsonStringify(unknown: unknown, noSpace = false): string {
  return JSON.stringify(
    unknown,
    (_key, value: unknown) => {
      if (value instanceof Uint8Array) {
        return uint8ArrayToHex(value);
      }

      if (typeof value === "bigint") {
        // eslint-disable-next-line no-restricted-syntax
        return value.toString();
      }

      if (typeof value === "function") {
        return undefined;
      }

      return value;
    },
    noSpace ? undefined : 2,
  );
}

export type Account = {
  address: string;
  privateKey: string;
};

export const LOCAL_NET_DEFAULT_WALLET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

export const LOCAL_NET_DEFAULT_ACCOUNTS = [
  {
    address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    privateKey: LOCAL_NET_DEFAULT_WALLET_KEY,
  },
  {
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    privateKey:
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  {
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    privateKey:
      "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
  {
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    privateKey:
      "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  },
  {
    address: "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    privateKey:
      "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  },
  {
    address: "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    privateKey:
      "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  },
  {
    address: "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    privateKey:
      "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  },
  {
    address: "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    privateKey:
      "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
  },
  {
    address: "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    privateKey:
      "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
  },
  {
    address: "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
    privateKey:
      "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  },
] as const satisfies Account[];

export const LOCAL_NET_WALLET_KEYS = LOCAL_NET_DEFAULT_ACCOUNTS.map(
  ({ privateKey }) => {
    return privateKey;
  },
);
