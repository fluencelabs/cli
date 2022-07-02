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

import { CommandObj, Dependency, NO_INPUT_FLAG_NAME } from "./const";
import { execPromise } from "./execPromise";
import { ensureUserFluenceDir } from "./pathsGetters/ensureUserFluenceDir";
import { confirm } from "./prompt";

const npmInstall = async (
  name: string,
  version: string,
  npmPath: string,
  message: string
): Promise<string> =>
  execPromise(`npm i ${name}@${version} -g --prefix=${npmPath}`, message);

export const ensureNpmDir = async (commandObj: CommandObj): Promise<string> => {
  const userFluenceDir = await ensureUserFluenceDir(commandObj);
  const npmPath = path.join(userFluenceDir, "npm");
  await fsPromises.mkdir(npmPath, { recursive: true });
  return npmPath;
};

type EnsureNpmDependencyOptions = {
  dependency: Dependency;
  commandObj: CommandObj;
  confirmMessage: string;
  installMessage: string;
  isInteractive: boolean;
};

export const ensureNpmDependency = async ({
  dependency: { name, version, bin },
  commandObj,
  confirmMessage,
  installMessage,
  isInteractive,
}: EnsureNpmDependencyOptions): Promise<string> => {
  const npmDirPath = await ensureNpmDir(commandObj);

  const dependencyPath = path.join(npmDirPath, "bin", bin);

  try {
    await fsPromises.access(dependencyPath);
    const result = await execPromise(`${dependencyPath} -v`);
    if (!result.includes(version)) {
      throw new Error("Outdated");
    }
  } catch {
    const doInstall =
      !isInteractive ||
      (await confirm({
        message: confirmMessage,
        isInteractive,
        flagName: NO_INPUT_FLAG_NAME,
      }));

    if (!doInstall) {
      commandObj.error("You have to confirm in order to continue");
    }

    await npmInstall(name, version, npmDirPath, installMessage);
  }

  return dependencyPath;
};
