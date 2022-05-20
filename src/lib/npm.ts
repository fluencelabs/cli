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

import { getUserFluenceDir } from "./getFluenceDir";
import type { CommandObj, Dependency } from "./const";
import { execPromise } from "./execPromise";

const npmInstall = async (
  name: string,
  version: string,
  npmPath: string,
  message: string
): Promise<string> =>
  execPromise(`npm i ${name}@${version} -g --prefix=${npmPath}`, message);

export const getNpmPath = async (commandObj: CommandObj): Promise<string> => {
  const userFluenceDir = await getUserFluenceDir(commandObj);
  const npmPath = path.join(userFluenceDir, "npm");

  try {
    await fsPromises.access(npmPath);
  } catch {
    await fsPromises.mkdir(npmPath, { recursive: true });
  }

  return npmPath;
};

export const ensureNpmDependency = async (
  { name, version, bin }: Dependency,
  commandObj: CommandObj,
  message: string
): Promise<string> => {
  const npmPath = await getNpmPath(commandObj);

  const dependencyPath = path.join(npmPath, "bin", bin);

  try {
    await fsPromises.access(dependencyPath);
  } catch {
    await npmInstall(name, version, npmPath, message);
  }

  return dependencyPath;
};
