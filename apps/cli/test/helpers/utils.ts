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

import { access, readFile, writeFile } from "node:fs/promises";

import core from "@actions/core";
import lockfile from "proper-lockfile";
import { test } from "vitest";

export const sleepSeconds = (s: number) => {
  return new Promise<void>((resolve) => {
    return setTimeout(resolve, s * 1000);
  });
};

async function createFileIfNotExists(filePath: string) {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, "");
  }
}

/**
 * Locks the given file, processes its content using the provided function,
 * save the result to the file and returns the result.
 *
 * @param {string} filePath - The path of the file to lock and process.
 * @param {(data: string) => string} processDataFunction - The function to process the file's content.
 * @return {Promise<string>} A promise that resolves with the processed data.
 * @throws {Error} If an error occurs during the file operations.
 */
export async function lockAndProcessFile(
  filePath: string,
  processDataFunction: (data: string) => string,
): Promise<string> {
  await createFileIfNotExists(filePath);
  let release: Awaited<ReturnType<typeof lockfile.lock>> | undefined;

  try {
    release = await lockfile.lock(filePath, {
      retries: {
        retries: 30,
        minTimeout: 100,
        maxTimeout: 500,
      },
    });

    const data = await readFile(filePath, "utf-8");
    const processedData = processDataFunction(data);
    await writeFile(filePath, processedData);
    return processedData;
  } catch (error) {
    console.error(`Error during working with a file '${filePath}':`, error);
    throw error;
  } finally {
    await release?.();
  }
}

export function wrappedTest(name: string, fn: () => Promise<void> | void) {
  test(name, async (...args) => {
    core.startGroup(name);
    // @ts-expect-error fn is never undefined here
    await fn(...args);
    core.endGroup();
  });
}
