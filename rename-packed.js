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
import { rename, readdir } from "fs/promises";
import { exec } from "child_process";
import { promisify } from "util";
import cliPackageJSON from "./packages/cli/package/package.json" with { type: "json" };
/*
This script renames the packed files in the dist folder to include
the current commit hash, cause there might be a different commit hash in the cache
*/
const { stdout: commitHash } = await promisify(exec)(
  "git rev-parse --short HEAD",
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
