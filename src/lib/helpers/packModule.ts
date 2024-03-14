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

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { buildModules } from "../buildModules.js";
import type { FluenceConfigReadonly } from "../configs/project/fluence.js";
import {
  type ModuleConfigReadonly,
  initNewModuleConfig,
} from "../configs/project/module.js";
import {
  DEFAULT_IPFS_ADDRESS,
  MODULE_CONFIG_FULL_FILE_NAME,
  WASM_EXT,
} from "../const.js";
import { createIPFSClient } from "../localServices/ipfs.js";
import type { MarineCLI } from "../marineCli.js";
import { ensureFluenceTmpModulePath } from "../paths.js";

import { getModuleWasmPath } from "./downloadFile.js";

export async function packModule(
  moduleConfig: ModuleConfigReadonly,
  marineCli: MarineCLI,
  marineBuildArgs: string | undefined,
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null,
  destination: string,
) {
  await buildModules(
    [moduleConfig],
    marineCli,
    marineBuildArgs,
    maybeFluenceConfig,
  );

  const wasmPath = getModuleWasmPath(moduleConfig);
  const tmpModuleDirPath = await ensureFluenceTmpModulePath();

  const tmpModuleConfigDirPath = join(
    tmpModuleDirPath,
    MODULE_CONFIG_FULL_FILE_NAME,
  );

  await copyFile(moduleConfig.$getPath(), tmpModuleConfigDirPath);

  const tmpWasmPath = join(
    tmpModuleDirPath,
    `${moduleConfig.name}.${WASM_EXT}`,
  );

  await copyFile(wasmPath, tmpWasmPath);

  const moduleToPackConfig = await initNewModuleConfig(
    tmpModuleConfigDirPath,
    moduleConfig.name,
  );

  delete moduleToPackConfig.type;
  const ipfsClient = await createIPFSClient(DEFAULT_IPFS_ADDRESS);

  const { cid } = await ipfsClient.add(await readFile(tmpWasmPath), {
    cidVersion: 1,
    onlyHash: true,
  });

  moduleToPackConfig.cid = cid.toString();
  await moduleToPackConfig.$commit();

  const tar = (await import("tar")).default;

  await mkdir(destination, { recursive: true });

  await tar.c(
    {
      file: join(destination, `${moduleConfig.name}.tar.gz`),
      gzip: true,
      cwd: tmpModuleDirPath,
    },
    [
      relative(tmpModuleDirPath, tmpModuleConfigDirPath),
      relative(tmpModuleDirPath, tmpWasmPath),
    ],
  );
}
