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

import type { GatherImportsResult } from "@fluencelabs/npm-aqua-compiler";

import type { FluenceConfigReadonly } from "../configs/project/fluence.js";
import { builtInAquaDependenciesDirPath } from "../npm.js";
import {
  getFluenceAquaDir,
  ensureFluenceAquaDependenciesPath,
  projectRootDir,
} from "../paths.js";

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
        ? builtInAquaDependenciesDirPath
        : await ensureFluenceAquaDependenciesPath(),
    globalImports,
    aquaToCompileDirPath: projectRootDir,
  });
}
