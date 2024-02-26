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

import { access } from "node:fs/promises";
import { dirname } from "node:path";
import { cwd } from "node:process";

import type { GatherImportsResult } from "@fluencelabs/npm-aqua-compiler";

import type { FluenceConfigReadonly } from "../configs/project/fluence.js";
import { PACKAGE_JSON_FILE_NAME } from "../const.js";
import { builtInAquaDependenciesDirPath } from "../npm.js";
import {
  getFluenceAquaDir,
  ensureFluenceAquaDependenciesPath,
  projectRootDir,
} from "../paths.js";

import { recursivelyFindFile } from "./recursivelyFindFile.js";

type GetAquaImportsArg = {
  fluenceConfig: FluenceConfigReadonly | null;
  aquaImportsFromFlags?: string[] | undefined;
};

export async function getAquaImports({
  aquaImportsFromFlags,
  fluenceConfig = null,
}: GetAquaImportsArg): Promise<GatherImportsResult> {
  const fluenceAquaDirPath = getFluenceAquaDir();

  const globalImports = [
    ...(aquaImportsFromFlags ?? []),
    ...(fluenceConfig?.aquaImports ?? []),
  ];

  try {
    if (fluenceConfig !== null) {
      await access(fluenceAquaDirPath);
      globalImports.push(fluenceAquaDirPath);
    }
  } catch {}

  const { gatherImportsFromNpm } = await import(
    "@fluencelabs/npm-aqua-compiler"
  );

  return gatherImportsFromNpm({
    npmProjectDirPath:
      fluenceConfig === null
        ? await npmProjectDirPath()
        : await ensureFluenceAquaDependenciesPath(),
    globalImports,
    aquaToCompileDirPath: projectRootDir,
  });
}

async function npmProjectDirPath() {
  const packageJSONPath = await recursivelyFindFile(
    PACKAGE_JSON_FILE_NAME,
    cwd(),
  );

  if (packageJSONPath === null) {
    return builtInAquaDependenciesDirPath;
  }

  return dirname(packageJSONPath);
}
