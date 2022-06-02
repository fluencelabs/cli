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

import { init } from "../../commands/init";
import { CommandObj, FLUENCE_DIR_NAME } from "../const";
import { confirm } from "../prompt";

import { getProjectRootDir } from "./getProjectRootDir";

export const getProjectFluenceDirPath = (): string =>
  path.join(getProjectRootDir(), FLUENCE_DIR_NAME);

export const ensureProjectFluenceDirPath = async (
  commandObj: CommandObj
): Promise<string> => {
  const projectFluenceDirPath = getProjectFluenceDirPath();

  try {
    await fsPromises.access(projectFluenceDirPath);
    return projectFluenceDirPath;
  } catch {}

  commandObj.warn("Not a fluence project");

  const doInit = await confirm({
    message: `Do you want to init fluence project in the current directory (${process.cwd()})`,
  });

  if (!doInit) {
    commandObj.error(
      "Initialized fluence project is required in order to continue"
    );
  }

  await init(commandObj);

  return getProjectFluenceDirPath();
};
