/**
 * Copyright 2022 Fluence Labs Limited
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

import fsPromises from "node:fs/promises";
import path from "node:path";

export const recursivelyFindFile = async (
  fileName: string,
  dirPath: string
): Promise<null | string> => {
  let currentDirPath = dirPath;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const filePath = path.join(currentDirPath, fileName);

    try {
      // eslint-disable-next-line no-await-in-loop
      await fsPromises.access(filePath);
      return filePath;
    } catch {
      const parentDir = path.dirname(currentDirPath);

      if (parentDir === currentDirPath) {
        return null;
      }

      currentDirPath = parentDir;
    }
  }
};
