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

export function wrappedTest(
  name: string,
  fn: (
    context: Parameters<NonNullable<Parameters<typeof test>[2]>>[0],
  ) => Promise<void>,
) {
  test(name, async (...args) => {
    core.startGroup(name);
    await fn(...args);
    core.endGroup();
  });
}
