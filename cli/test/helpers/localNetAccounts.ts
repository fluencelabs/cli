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

import { LOCAL_NET_DEFAULT_ACCOUNTS, type Account } from "../../src/common.js";
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
