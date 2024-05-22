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

import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const FS_OPTIONS = "utf-8";

const WORKSPACE_NODE_MODULES_PATH = resolve("..", "node_modules");

const BIN_FILE_PATH = join(
  join(WORKSPACE_NODE_MODULES_PATH, "oclif", "lib", "tarballs"),
  "bin.js",
);

const WIN_BIN_FILE_PATH = join(
  WORKSPACE_NODE_MODULES_PATH,
  "oclif",
  "lib",
  "commands",
  "pack",
  "win.js",
);

const NODE_DOWNLOAD_FILE_PATH = join(
  WORKSPACE_NODE_MODULES_PATH,
  "oclif",
  "lib",
  "tarballs",
  "node.js",
);

async function patchOclif(fileName: string, search: string, insert: string) {
  try {
    const binFileContent = await readFile(fileName, FS_OPTIONS);

    const hasSearch = binFileContent.includes(search);
    const hasInsert = binFileContent.includes(insert);

    if (hasSearch && !hasInsert) {
      const newBinFileContent = binFileContent.replace(search, insert);

      await writeFile(fileName, newBinFileContent, FS_OPTIONS);
    } else if (!hasSearch && !hasInsert) {
      throw new Error(`Wasn't able to find '${search}' in ${fileName}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Error while modifying ${fileName}`);
    throw err;
  }
}

// Unix replacement
await patchOclif(
  BIN_FILE_PATH,
  "#!/usr/bin/env bash",
  "#!/usr/bin/env bash\nexport NODE_NO_WARNINGS=1",
);

// Windows replacement
await patchOclif(
  WIN_BIN_FILE_PATH,
  "setlocal enableextensions",
  "setlocal enableextensions\nset NODE_NO_WARNINGS=1",
);

// Pack tar.gz for Windows. We need it to perform update
await patchOclif(
  WIN_BIN_FILE_PATH,
  "await Tarballs.build(buildConfig, { pack: false, parallel: true, platform: 'win32', tarball: flags.tarball });",
  "await Tarballs.build(buildConfig, { pack: true, parallel: true, platform: 'win32', tarball: flags.tarball });",
);

// Set correct redirection command on Windows
await patchOclif(
  WIN_BIN_FILE_PATH,
  '"%~dp0\\\\..\\\\client\\\\bin\\\\node.exe" "%~dp0\\\\..\\\\client\\\\${additionalCLI ? `${additionalCLI}\\\\bin\\\\run` : \'bin\\\\run\'}" %*',
  '"%~dp0\\\\..\\\\client\\\\bin\\\\fluence.cmd" %*',
);

await patchOclif(
  NODE_DOWNLOAD_FILE_PATH,
  `await retry(download, {
            factor: 1,
            maxTimeout: RETRY_TIMEOUT_MS,
            minTimeout: RETRY_TIMEOUT_MS,
            onRetry(_e, attempt) {
                (0, log_1.log)(${"`retrying node download (attempt ${attempt})`"});
            },
            retries: 3,
        });`,
  "await download()",
);
