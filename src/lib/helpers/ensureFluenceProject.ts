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
import { initConfigOptions as fluenceConfigInitOptions } from "../configs/project/fluence";
import { CommandObj, FLUENCE_CONFIG_FILE_NAME } from "../const";
import { confirm } from "../prompt";

export const ensureFluenceProject = async (
  commandObj: CommandObj,
  isInteractive: boolean
): Promise<void> => {
  const projectFluencePath = path.join(
    await fluenceConfigInitOptions.getConfigDirPath(commandObj),
    FLUENCE_CONFIG_FILE_NAME
  );

  try {
    await fsPromises.access(projectFluencePath);
    return;
  } catch {}

  const errorMessage = "Not a fluence project";

  if (!isInteractive) {
    commandObj.error(errorMessage);
  }

  commandObj.warn(errorMessage);

  const doInit = await confirm({
    message: `Do you want to init fluence project in the current directory (${process.cwd()})`,
    isInteractive,
  });

  if (!doInit) {
    commandObj.error(
      "Initialized fluence project is required in order to continue"
    );
  }

  return init({ commandObj, isInteractive });
};
