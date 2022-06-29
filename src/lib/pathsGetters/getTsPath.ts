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

import path from "node:path";

import {
  APP_TS_FILE_NAME,
  DEPLOYED_APP_TS_FILE_NAME,
  TS_DIR_NAME,
} from "../const";

import { getProjectFluenceDirPath } from "./getProjectFluenceDirPath";

export const getTsPath = (): string => {
  const projectFluenceDir = getProjectFluenceDirPath();
  return path.join(projectFluenceDir, TS_DIR_NAME);
};

export const getAppTsPath = (): string =>
  path.join(getTsPath(), APP_TS_FILE_NAME);

export const getDeployedAppTsPath = (): string =>
  path.join(getTsPath(), DEPLOYED_APP_TS_FILE_NAME);
