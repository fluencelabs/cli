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
