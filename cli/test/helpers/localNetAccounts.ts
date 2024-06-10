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

import assert from "node:assert";

import { LOCAL_NET_DEFAULT_ACCOUNTS, type Account } from "@repo/common";

import { numToStr } from "../../src/lib/helpers/typesafeStringify.js";

import { lockAndProcessFile } from "./utils.js";

const PRIVATE_KEY_INDEX_FILE_PATH = "tmp/private_key_index.txt";

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
    // increase the index that has already been used in the previous test worker
    index = Number(dataFromFile) + 1;
  }

  if (isNaN(index)) {
    throw Error(`Data is not a number: ${dataFromFile}`);
  }

  // if the index is out of bounds, reset it
  if (index >= LOCAL_NET_DEFAULT_ACCOUNTS.length) {
    index = 0;
  }

  return numToStr(index);
}

/**
 * Retrieves the unique sender account to provide it for the current test worker.
 * The account is retrieved from the LOCAL_NET_DEFAULT_ACCOUNTS array
 * using the index from the PRIVATE_KEY_INDEX_FILE_PATH file.
 *
 * @returns {Promise<Account>} - A promise that resolves to the default sender account.
 */
async function getTestDefaultSenderAccount(): Promise<Account> {
  const index = await lockAndProcessFile(
    PRIVATE_KEY_INDEX_FILE_PATH,
    getNextIndex,
  );

  const account = LOCAL_NET_DEFAULT_ACCOUNTS[Number(index)];
  assert(account !== undefined);

  return account;
}

export const TEST_DEFAULT_SENDER_ACCOUNT = await getTestDefaultSenderAccount();
