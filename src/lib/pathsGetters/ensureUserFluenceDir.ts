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
import os from "node:os";
import path from "node:path";

import { CommandObj, FLUENCE_DIR_NAME } from "../const";

export const ensureUserFluenceDir = async (
  commandObj: CommandObj
): Promise<string> => {
  if (commandObj.config.windows) {
    await fsPromises.mkdir(commandObj.config.configDir, { recursive: true });
    return commandObj.config.configDir;
  }

  const fluenceDir = path.join(os.homedir(), FLUENCE_DIR_NAME);
  await fsPromises.mkdir(fluenceDir, { recursive: true });
  return fluenceDir;
};
