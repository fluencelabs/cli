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

// @ts-check
import { rename, readFile, readdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";

/*

This script renames the packed files in the dist folder to include
the current commit hash, cause there might be a different commit hash in the cache

*/

const pathToCLIPackageJSON = "packages/cli/package/package.json";
const cliPackageJSON = JSON.parse(
  await readFile(pathToCLIPackageJSON, "utf-8"),
);

if (
  typeof cliPackageJSON !== "object" ||
  cliPackageJSON === null ||
  !("version" in cliPackageJSON) ||
  typeof cliPackageJSON.version !== "string" ||
  !("oclif" in cliPackageJSON) ||
  typeof cliPackageJSON.oclif !== "object" ||
  cliPackageJSON.oclif === null ||
  !("bin" in cliPackageJSON.oclif) ||
  typeof cliPackageJSON.oclif.bin !== "string"
) {
  throw new Error(
    `Expected ${pathToCLIPackageJSON} to contain a valid package.json with a version field and oclif.bin field`,
  );
}

const { stdout: commitHash } = await promisify(exec)(
  "git rev-parse --short=8 HEAD",
);

const common = `${cliPackageJSON.oclif.bin}-v${cliPackageJSON.version}`;
const DIST_PATH = "./packages/cli/package/dist/";

await Promise.all(
  (await readdir(DIST_PATH))
    .filter((file) => file.startsWith(common))
    .map((fileName) => {
      const [, , , ...rest] = fileName.split("-");
      const newFileName = [common, commitHash.trim(), ...rest].join("-");

      if (fileName === newFileName) {
        return;
      }

      console.log(`Renaming ${fileName} to ${newFileName}`);
      return rename(`${DIST_PATH}${fileName}`, `${DIST_PATH}${newFileName}`);
    }),
);
