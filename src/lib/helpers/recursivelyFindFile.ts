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

import { access, readdir } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";

export const recursivelyFindFile = async (
  fileName: string,
  dirPath: string
): Promise<null | string> => {
  let currentDirPath = dirPath;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filePath = join(currentDirPath, fileName);

    try {
      // eslint-disable-next-line no-await-in-loop
      await access(filePath);
      return filePath;
    } catch {
      const parentDir = dirname(currentDirPath);

      if (parentDir === currentDirPath) {
        return null;
      }

      currentDirPath = parentDir;
    }
  }
};

const recursivelyGetDirFiles = async (
  dirPath: string
): Promise<Array<string>> =>
  (
    await Promise.all(
      (
        await readdir(dirPath, { withFileTypes: true })
      ).map((entry) => {
        const fileOrDirPath = resolve(dirPath, entry.name);
        return entry.isDirectory()
          ? recursivelyGetDirFiles(fileOrDirPath)
          : fileOrDirPath;
      })
    )
  ).flat();

export const recursivelyFindFileInADir = async (
  dirPath: string,
  fullFileName: string
) =>
  (await recursivelyGetDirFiles(dirPath)).filter((filePath) =>
    filePath.endsWith(fullFileName)
  );
