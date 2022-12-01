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
  DEFAULT_SRC_AQUA_FILE_NAME,
  DEPLOYED_APP_AQUA_FILE_NAME,
  DEPLOYED_APP_JS_FILE_NAME,
  DEPLOYED_APP_TS_FILE_NAME,
  DEPLOY_CONFIG_FILE_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_CONFIG_FILE_NAME,
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
import { recursivelyFindFile } from "./helpers/recursivelyFindFile";

export const validatePath = async (path: string): Promise<string | true> => {
  try {
    await fsPromises.access(path);
    return true;
  } catch (error) {
    return String(error);
  }
};

export const ensureDir = async (dirPath: string): Promise<string> => {
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

// Project paths:

// cwd is cached in order for paths to be correct even if cwd changes during the
// execution (e.g. Marince CLI has to change cwd in order to work correctly)
const initialCwd = process.cwd();
export let projectRootDirPromise = (async (): Promise<string> => {
  const fluenceConfigPath = await recursivelyFindFile(
    FLUENCE_CONFIG_FILE_NAME,
    initialCwd
  );

  if (fluenceConfigPath === null) {
    return initialCwd;
  }

  const newProjectRootDir = path.dirname(fluenceConfigPath);
  return newProjectRootDir;
})().catch((error): never => {
  throw error;
});

export const setProjectRootDir = (dir: string): void => {
  projectRootDirPromise = Promise.resolve(dir);
};

export const ensureSrcAquaDir = async (): Promise<string> =>
  ensureDir(
    path.join(await projectRootDirPromise, SRC_DIR_NAME, AQUA_DIR_NAME)
  );

export const ensureSrcAquaMainPath = async (): Promise<string> =>
  path.join(await ensureSrcAquaDir(), DEFAULT_SRC_AQUA_FILE_NAME);

export const ensureVSCodeDir = async (): Promise<string> =>
  ensureDir(path.join(await projectRootDirPromise, VSCODE_DIR_NAME));

export const ensureVSCodeSettingsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), SETTINGS_JSON_FILE_NAME);

export const ensureVSCodeExtensionsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), EXTENSIONS_JSON_FILE_NAME);

export const getGitignorePath = async (): Promise<string> =>
  path.join(await projectRootDirPromise, GITIGNORE_FILE_NAME);

// Project .fluence paths:

export const ensureFluenceDir = async (): Promise<string> =>
  ensureDir(path.join(await projectRootDirPromise, FLUENCE_DIR_NAME));

export const ensureFluenceAquaDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), AQUA_DIR_NAME));

export const ensureFluenceAquaServicesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceAquaDir(), AQUA_SERVICES_DIR_NAME));

export const ensureFluenceAquaDeployedAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceAquaDir(), DEPLOYED_APP_AQUA_FILE_NAME);

// JS

export const ensureFluenceJSAppPath = async (
  fluenceJSDir: string
): Promise<string> =>
  path.join(await ensureDir(fluenceJSDir), APP_JS_FILE_NAME);

export const ensureFluenceJSDeployedAppPath = async (
  fluenceJSDir: string
): Promise<string> =>
  path.join(await ensureDir(fluenceJSDir), DEPLOYED_APP_JS_FILE_NAME);

export const ensureDefaultJSDirPath = async (): Promise<string> =>
  ensureDir(path.join(await projectRootDirPromise, SRC_DIR_NAME, JS_DIR_NAME));

export const ensureDefaultJSPath = async (): Promise<string> =>
  ensureDir(path.join(await ensureDefaultJSDirPath(), SRC_DIR_NAME));

export const ensureDefaultAquaJSPath = async (): Promise<string> =>
  ensureDir(
    path.join(await ensureDefaultJSDirPath(), SRC_DIR_NAME, AQUA_DIR_NAME)
  );

// TS

export const ensureFluenceTSAppPath = async (
  fluenceTSDir: string
): Promise<string> =>
  path.join(await ensureDir(fluenceTSDir), APP_TS_FILE_NAME);

export const ensureFluenceTSDeployedAppPath = async (
  fluenceTSDir: string
): Promise<string> =>
  path.join(await ensureDir(fluenceTSDir), DEPLOYED_APP_TS_FILE_NAME);

export const ensureDefaultTSDirPath = async (): Promise<string> =>
  ensureDir(path.join(await projectRootDirPromise, SRC_DIR_NAME, TS_DIR_NAME));

export const ensureDefaultTSPath = async (): Promise<string> =>
  ensureDir(path.join(await ensureDefaultTSDirPath(), SRC_DIR_NAME));

export const ensureDefaultAquaTSPath = async (): Promise<string> =>
  ensureDir(
    path.join(await ensureDefaultTSDirPath(), SRC_DIR_NAME, AQUA_DIR_NAME)
  );

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
