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

import {
  APP_SERVICES_AQUA,
  APP_SERVICES_AQUA_FILE_NAME,
  CommandObj,
  FS_OPTIONS,
} from "../const";
import { ensureDefaultAquaPath } from "../pathsGetters/ensureDefaultAquaDir";

export const ensureAppServicesAquaFile = async (
  commandObj: CommandObj
): Promise<string> => {
  const aquaPath = await ensureDefaultAquaPath(commandObj);
  const appServicesFilePath = path.join(aquaPath, APP_SERVICES_AQUA_FILE_NAME);
  await fsPromises.writeFile(
    appServicesFilePath,
    APP_SERVICES_AQUA,
    FS_OPTIONS
  );
  return aquaPath;
};
