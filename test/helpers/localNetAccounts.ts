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

import assert from "node:assert";

import { lockAndProcessFile } from "./utils.js";

const PRIVATE_KEY_INDEX_FILE_PATH = "tmp/private_key_index.txt";

type Account = {
  address: string;
  privateKey: string;
};
export const LOCAL_NET_SENDER_ACCOUNT: Account = {
  address: "0x627e730fd1361E6FFcee236DAc08F82EAa8ac7cD",
  privateKey:
    "0x3cc23e0227bd17ea5d6ea9d42b5eaa53ad41b1974de4755c79fe236d361a6fd5",
};
export const LOCAL_NET_DEFAULT_ACCOUNTS: Account[] = [
  {
    address: "0x698e60B4071F5fc8fD6ee8bd3a5f77E392B4651e",
    privateKey:
      "0x089162470bcfc93192b95bff0a1860d063266875c782af9d882fcca125323b41",
  },
  {
    address: "0xC6B7816d83795Dda6607Ccb6e7F67Eed1e718802",
    privateKey:
      "0xdacd4b197ee7e9efdd5db1921c6c558d88e2c8b69902b8bafc812fb226a6b5e0",
  },
  {
    address: "0xdD1cB4f793fbBA35f31a7c69dA87c1a0c0B76295",
    privateKey:
      "0xa22813cba71d9795475e88d8d84fd3ef6e9ed4e3d5f3c34462ae1645cd1f7f16",
  },
  {
    address: "0x54Ae65E9186e12198e17218B2d7e765a204B890c",
    privateKey:
      "0xf96cde07b5743540fbad99faaabc7ac3158d5665f1eed0ec7ad913622b121903",
  },
  {
    address: "0x90f9D3c4301a034746fC2f9f503FF5972cC523F8",
    privateKey:
      "0xfeb277a2fb0e226a729174c44bcc7dcb94dcfef7d4c1eb77e60e83a176f812cd",
  },
  {
    address: "0x7B09144F9Be6Cd8fc355fde9CA05E0eEB36b1361",
    privateKey:
      "0xfdc4ba94809c7930fe4676b7d845cbf8fa5c1beae8744d959530e5073004cf3f",
  },
  {
    address: "0x0B9B9ac40DC527Ea6a98110B796b0007074D49Dd",
    privateKey:
      "0xc9b5b488586bf92ed1fe35a985b48b92392087e86da2011896c289e0010fc6bf",
  },
  {
    address: "0x313f340305199bA942f5e4C04E56d2A74cf38246",
    privateKey:
      "0xe6776a7310afaffed6aeca2b54b1547d72dbfc9268ed05850584ddce53cf87a1",
  },
  {
    address: "0x76C74B9f1AA5F345215BDf4aA6739a22E12687e7",
    privateKey:
      "0xb454e1649f031838a3b63b2fb693635266e048754f23cae6d9718250e3fb8905",
  },
  {
    address: "0x932426283C37903F3aCA58ED5D7d63E905c6303B",
    privateKey:
      "0xb8849e63d7c25960af6eaff78fd82fe916b2c20cf569aaf4fa259c15faedd146",
  },
  {
    address: "0x42323701Ab0A13c1E3e9a16CAb8BC58e542E2c9D",
    privateKey:
      "0x53513db9b03255c58b5f535e6d9e15bb3bfed583839094126b9a42ce2aa7469c",
  },
  {
    address: "0x456D00fbde22d021a5bA78761A7EC568Af4930Fa",
    privateKey:
      "0x66486a3148467413a10cc8891b657bf092d307e066a08b833b892913607aede0",
  },
  {
    address: "0x65CB4D7368C50E8a980eD646A2BaaA51d8c88086",
    privateKey:
      "0x5918ecc0f743222dee4ae4f2be17965e785435af6223ad3bdff80354d893f0c2",
  },
  {
    address: "0x3eD993dE8847a604A6FA72A44EE6F140aCba64A8",
    privateKey:
      "0xb76b8ce771bfccf0167c3b2a51993e7687a4d8cbfb9ced61a98f601a772bda08",
  },
  {
    address: "0x00fF5Fd1648bE1FEB36009B4b5fb5f8a2e5eF60d",
    privateKey:
      "0xcb448613322f0ae09bb111e6bfd5be93480f1ec521b062a614f9af025c8f1852",
  },
  {
    address: "0xFF3Ffe08eCC9733a4d138cD99207707BBA25d9C7",
    privateKey:
      "0x147840cb64e7c4ae02917144897c37b521b859ac643bf55ec83444c11c3a8a30",
  },
  {
    address: "0xd3F791b092250da6D2edb6077Fc7a175DDab8E0e",
    privateKey:
      "0x1a1bf9026a097f33ce1a51f5aa0c4102e4a1432c757d922200ef37df168ae504",
  },
  {
    address: "0x9F5c16B53c363c73AF15F1dd5c1f68A6a4328637",
    privateKey:
      "0xbb3457514f768615c8bc4061c7e47f817c8a570c5c3537479639d4fad052a98a",
  },
  {
    address: "0x6f10E8209296Ea9e556f80b0Ff545D8175F271d0",
    privateKey:
      "0xfbd9e512cc1b62db1ca689737c110afa9a3799e1bc04bf12c1c34ac39e0e2dd5",
  },
];

/**
 * Increases the index of the default sender account to provide a unique account for each test worker
 * If the data is empty, the index is set to 0. Otherwise, the index is increased by 1.
 * If the index is out of bounds, it is reset to 0. The resulting index is returned as a string.
 *
 * @param {string} dataFromFile - The data obtained from a file.
 * @throws {Error} If the data is not a valid number.
 * @returns {string} The resulting index as a string.
 */
function getNextIndex(dataFromFile: string): string {
  let index: number;

  if (dataFromFile === "") {
    index = 0;
  } else {
    index = Number(dataFromFile) + 1;
  }

  if (isNaN(index)) {
    throw Error(`Data is not a number: ${dataFromFile}`);
  }

  // if the index is out of bounds, reset it
  if (index >= LOCAL_NET_DEFAULT_ACCOUNTS.length) {
    index = 0;
  }

  return index.toString();
}

/**
 * Retrieves the unique sender account to provide it for the current test worker.
 * The account is retrieved from the LOCAL_NET_DEFAULT_ACCOUNTS array
 * using the index from the PRIVATE_KEY_INDEX_FILE_PATH file.
 *
 * @returns {Promise<Account>} - A promise that resolves to the default sender account.
 */
export async function getTestDefaultSenderAccount(): Promise<Account> {
  const index = await lockAndProcessFile(
    PRIVATE_KEY_INDEX_FILE_PATH,
    getNextIndex,
  );

  const account = LOCAL_NET_DEFAULT_ACCOUNTS[Number(index)];
  assert(account !== undefined);

  return account;
}

export const TEST_DEFAULT_SENDER_ACCOUNT = await getTestDefaultSenderAccount();
