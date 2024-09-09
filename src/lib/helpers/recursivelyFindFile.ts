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

import { access } from "node:fs/promises";
import { dirname, join } from "node:path";

export const recursivelyFindFile = async (
  fileName: string,
  dirPath: string,
): Promise<null | string> => {
  let currentDirPath = dirPath;

  let filePathToReturn: undefined | string | null;

  while (filePathToReturn === undefined) {
    const filePath = join(currentDirPath, fileName);

    try {
      await access(filePath);
      filePathToReturn = filePath;
    } catch {
      const parentDir = dirname(currentDirPath);

      if (parentDir === currentDirPath) {
        filePathToReturn = null;
        continue;
      }

      currentDirPath = parentDir;
    }
  }

  return filePathToReturn;
};
