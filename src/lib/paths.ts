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
  AQUA_SERVICES_DIR_NAME,
  CARGO_DIR_NAME,
  CommandObj,
  CONFIG_TOML,
  CRATES_TOML,
  DEFAULT_SRC_AQUA_FILE_NAME,
  DEPLOYED_APP_AQUA_FILE_NAME,
  DEPLOYED_APP_JS_FILE_NAME,
  DEPLOYED_APP_TS_FILE_NAME,
  DEPLOY_CONFIG_FILE_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_DIR_NAME,
  GITIGNORE_FILE_NAME,
  JS_DIR_NAME,
  MODULES_DIR_NAME,
  NPM_DIR_NAME,
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

// User .fluence paths:

export const ensureUserFluenceDir = async (
  commandObj: CommandObj
): Promise<string> =>
  commandObj.config.windows
    ? ensureDir(commandObj.config.configDir)
    : ensureDir(path.join(os.homedir(), FLUENCE_DIR_NAME));

export const ensureUserFluenceNpmDir = async (
  commandObj: CommandObj
): Promise<string> =>
  ensureDir(path.join(await ensureUserFluenceDir(commandObj), NPM_DIR_NAME));

export const ensureUserFluenceCargoDir = async (
  commandObj: CommandObj
): Promise<string> =>
  ensureDir(path.join(await ensureUserFluenceDir(commandObj), CARGO_DIR_NAME));

export const ensureUserFluenceCargoCratesPath = async (
  commandObj: CommandObj
): Promise<string> =>
  path.join(await ensureUserFluenceCargoDir(commandObj), CRATES_TOML);

// Project paths:

// cwd is cached in order for paths to be correct even if cwd changes during the
// execution (e.g. Marince CLI has to change cwd in order to work correctly)
const projectRootDir = process.cwd();
export const getProjectRootDir = (): string => projectRootDir;

export const ensureSrcAquaDir = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), SRC_DIR_NAME, AQUA_DIR_NAME));

export const ensureSrcAquaMainPath = async (): Promise<string> =>
  path.join(await ensureSrcAquaDir(), DEFAULT_SRC_AQUA_FILE_NAME);

export const ensureVSCodeDir = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), VSCODE_DIR_NAME));

export const ensureVSCodeSettingsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), SETTINGS_JSON_FILE_NAME);

export const ensureVSCodeExtensionsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), EXTENSIONS_JSON_FILE_NAME);

export const getGitignorePath = (): string =>
  path.join(getProjectRootDir(), GITIGNORE_FILE_NAME);

// Project .fluence paths:

export const ensureFluenceDir = (): Promise<string> =>
  ensureDir(path.join(getProjectRootDir(), FLUENCE_DIR_NAME));

export const ensureFluenceAquaDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), AQUA_DIR_NAME));

export const ensureFluenceAquaServicesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceAquaDir(), AQUA_SERVICES_DIR_NAME));

export const ensureFluenceAquaDeployedAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceAquaDir(), DEPLOYED_APP_AQUA_FILE_NAME);

export const ensureFluenceJSDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), JS_DIR_NAME));

export const ensureFluenceJSAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceJSDir(), APP_JS_FILE_NAME);

export const ensureFluenceJSDeployedAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceJSDir(), DEPLOYED_APP_JS_FILE_NAME);

export const ensureFluenceTSDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), TS_DIR_NAME));

export const ensureFluenceTSAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceTSDir(), APP_TS_FILE_NAME);

export const ensureFluenceTSDeployedAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceTSDir(), DEPLOYED_APP_TS_FILE_NAME);

export const ensureFluenceModulesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), MODULES_DIR_NAME));

export const ensureFluenceServicesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), SERVICES_DIR_NAME));

export const ensureFluenceTmpDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), TMP_DIR_NAME));

export const ensureFluenceTmpAppServiceJsonPath = async (): Promise<string> =>
  path.join(await ensureFluenceTmpDir(), APP_SERVICE_JSON_FILE_NAME);

export const ensureFluenceTmpDeployJsonPath = async (): Promise<string> =>
  path.join(await ensureFluenceTmpDir(), DEPLOY_CONFIG_FILE_NAME);

export const ensureFluenceTmpConfigTomlPath = async (): Promise<string> =>
  path.join(await ensureFluenceTmpDir(), CONFIG_TOML);
