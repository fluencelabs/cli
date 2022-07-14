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

import {
  APP_JS_FILE_NAME,
  APP_SERVICE_JSON_FILE_NAME,
  APP_TS_FILE_NAME,
  AQUA_DIR_NAME,
  ARTIFACTS_DIR_NAME,
  CommandObj,
  DEFAULT_SRC_AQUA_FILE_NAME,
  DEPLOYED_APP_AQUA_FILE_NAME,
  DEPLOYED_APP_JS_FILE_NAME,
  DEPLOYED_APP_TS_FILE_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_DIR_NAME,
  GITIGNORE_FILE_NAME,
  JS_DIR_NAME,
  MODULES_DIR_NAME,
  SERVICES_DIR_NAME,
  SETTINGS_JSON_FILE_NAME,
  SRC_DIR_NAME,
  TMP_DIR_NAME,
  TS_DIR_NAME,
  VSCODE_DIR_NAME,
} from "./const";

const ensureDir = async (dirPath: string): Promise<string> => {
  await fsPromises.mkdir(dirPath, { recursive: true });
  return dirPath;
};

export const getProjectRootDir = (): string => process.cwd();

export const ensureUserFluenceDir = async (
  commandObj: CommandObj
): Promise<string> =>
  commandObj.config.windows
    ? ensureDir(commandObj.config.configDir)
    : ensureDir(path.join(os.homedir(), FLUENCE_DIR_NAME));

export const ensureProjectFluenceDirPath = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), FLUENCE_DIR_NAME));

// artifacts dir not needed anymore but I leave it for now because it was used in the demo
// on the community call
export const ensureArtifactsPath = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), ARTIFACTS_DIR_NAME));

export const ensureDefaultAquaPath = async (): Promise<string> =>
  ensureDir(path.join(await ensureProjectFluenceDirPath(), AQUA_DIR_NAME));

export const ensureDeployedAppAquaPath = async (): Promise<string> =>
  path.join(await ensureDefaultAquaPath(), DEPLOYED_APP_AQUA_FILE_NAME);

export const ensureJsPath = async (): Promise<string> =>
  ensureDir(path.join(await ensureProjectFluenceDirPath(), JS_DIR_NAME));

export const ensureAppJsPath = async (): Promise<string> =>
  path.join(await ensureJsPath(), APP_JS_FILE_NAME);

export const ensureDeployedAppJsPath = async (): Promise<string> =>
  path.join(await ensureJsPath(), DEPLOYED_APP_JS_FILE_NAME);

export const ensureTsPath = async (): Promise<string> =>
  ensureDir(path.join(await ensureProjectFluenceDirPath(), TS_DIR_NAME));

export const ensureAppTsPath = async (): Promise<string> =>
  path.join(await ensureJsPath(), APP_TS_FILE_NAME);

export const ensureDeployedAppTsPath = async (): Promise<string> =>
  path.join(await ensureJsPath(), DEPLOYED_APP_TS_FILE_NAME);

export const ensureModulesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureProjectFluenceDirPath(), MODULES_DIR_NAME));

export const ensureServicesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureProjectFluenceDirPath(), SERVICES_DIR_NAME));

export const ensureSrcAquaDirPath = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), SRC_DIR_NAME, AQUA_DIR_NAME));

export const ensureSrcMainAquaPath = async (): Promise<string> =>
  path.join(await ensureSrcAquaDirPath(), DEFAULT_SRC_AQUA_FILE_NAME);

export const ensureTmpPath = async (): Promise<string> =>
  ensureDir(path.join(await ensureProjectFluenceDirPath(), TMP_DIR_NAME));

export const ensureAppServiceJsonPath = async (): Promise<string> =>
  path.join(await ensureTmpPath(), APP_SERVICE_JSON_FILE_NAME);

export const ensureVSCodeDir = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), VSCODE_DIR_NAME));

export const ensureSettingsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), SETTINGS_JSON_FILE_NAME);

export const ensureExtensionsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), EXTENSIONS_JSON_FILE_NAME);

export const getGitignorePath = (): string =>
  path.join(getProjectRootDir(), GITIGNORE_FILE_NAME);
