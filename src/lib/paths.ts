/**
 * Copyright 2023 Fluence Labs Limited
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

import { commandObj } from "./commandObj.js";
import {
  APP_JS_FILE_NAME,
  APP_SERVICE_JSON_FILE_NAME,
  APP_TS_FILE_NAME,
  AQUA_DIR_NAME,
  AQUA_SERVICES_FILE_NAME,
  CARGO_DIR_NAME,
  CONFIG_TOML,
  CARGO_TOML,
  COUNTLY_DIR_NAME,
  DEFAULT_SRC_AQUA_FILE_NAME,
  DEPLOYED_APP_AQUA_FILE_NAME,
  DEPLOYED_APP_JS_FILE_NAME,
  DEPLOYED_APP_TS_FILE_NAME,
  DEPLOY_CONFIG_FILE_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
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
  AQUA_WORKERS_FILE_NAME,
  SPELLS_DIR_NAME,
} from "./const.js";
import { recursivelyFindFile } from "./helpers/recursivelyFindFile.js";
import { FLUENCE_USER_DIR } from "./setupEnvironment.js";

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

export const ensureUserFluenceDir = (): Promise<string> => {
  const globalFluenceDirPathFromEnv = process.env[FLUENCE_USER_DIR];

  if (typeof globalFluenceDirPathFromEnv === "string") {
    return ensureDir(globalFluenceDirPathFromEnv);
  }

  if (commandObj.config.windows) {
    return ensureDir(commandObj.config.configDir);
  }

  return ensureDir(path.join(os.homedir(), DOT_FLUENCE_DIR_NAME));
};

export const getUserCountlyDir = async (): Promise<string> =>
  path.join(await ensureUserFluenceDir(), COUNTLY_DIR_NAME, COUNTLY_DIR_NAME);

export const ensureUserFluenceTmpNpmDir = async (): Promise<string> =>
  ensureDir(
    path.join(await ensureUserFluenceDir(), TMP_DIR_NAME, NPM_DIR_NAME)
  );

export const ensureUserFluenceNpmDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureUserFluenceDir(), NPM_DIR_NAME));

export const ensureUserFluenceTmpCargoDir = async (): Promise<string> =>
  ensureDir(
    path.join(await ensureUserFluenceDir(), TMP_DIR_NAME, CARGO_DIR_NAME)
  );

export const ensureUserFluenceCargoDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureUserFluenceDir(), CARGO_DIR_NAME));

// Project paths:

const initialCwd = process.cwd();

export const recursivelyFindProjectRootDir = async (
  initialPath: string
): Promise<string> => {
  const fluenceConfigPath = await recursivelyFindFile(
    FLUENCE_CONFIG_FILE_NAME,
    initialPath
  );

  if (fluenceConfigPath === null) {
    return initialCwd;
  }

  return path.dirname(fluenceConfigPath);
};

export let projectRootDir = initialCwd;

export const setProjectRootDir = (dir: string): void => {
  projectRootDir = dir;
};

export const ensureSrcAquaDir = async (): Promise<string> =>
  ensureDir(path.join(projectRootDir, SRC_DIR_NAME, AQUA_DIR_NAME));

export const ensureSrcAquaMainPath = async (): Promise<string> =>
  path.join(await ensureSrcAquaDir(), DEFAULT_SRC_AQUA_FILE_NAME);

export const ensureVSCodeDir = async (): Promise<string> =>
  ensureDir(path.join(projectRootDir, VSCODE_DIR_NAME));

export const ensureVSCodeSettingsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), SETTINGS_JSON_FILE_NAME);

export const ensureVSCodeExtensionsJsonPath = async (): Promise<string> =>
  path.join(await ensureVSCodeDir(), EXTENSIONS_JSON_FILE_NAME);

export const getGitignorePath = (): string =>
  path.join(projectRootDir, GITIGNORE_FILE_NAME);

export const getCargoTomlPath = (): string =>
  path.join(projectRootDir, CARGO_TOML);

// Project .fluence paths:

export const ensureFluenceDir = async (): Promise<string> =>
  ensureDir(path.join(projectRootDir, DOT_FLUENCE_DIR_NAME));

export const ensureFluenceAquaDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), AQUA_DIR_NAME));

export const ensureFluenceAquaServicesPath = async (): Promise<string> =>
  path.join(await ensureFluenceAquaDir(), AQUA_SERVICES_FILE_NAME);

export const ensureFluenceAquaWorkersPath = async (): Promise<string> =>
  path.join(await ensureFluenceAquaDir(), AQUA_WORKERS_FILE_NAME);

export const ensureFluenceAquaDeployedAppPath = async (): Promise<string> =>
  path.join(await ensureFluenceAquaDir(), DEPLOYED_APP_AQUA_FILE_NAME);

// JS

export const ensureFluenceJSAppPath = async (
  fluenceJSRelativeDirPath: string
): Promise<string> =>
  path.join(
    await ensureDir(path.resolve(projectRootDir, fluenceJSRelativeDirPath)),
    APP_JS_FILE_NAME
  );

export const ensureFluenceJSDeployedAppPath = async (
  fluenceJSRelativeDirPath: string
): Promise<string> =>
  path.join(
    await ensureDir(path.resolve(projectRootDir, fluenceJSRelativeDirPath)),
    DEPLOYED_APP_JS_FILE_NAME
  );

export const getDefaultJSDirPath = (projectRootDir: string): string =>
  path.join(projectRootDir, SRC_DIR_NAME, JS_DIR_NAME);

export const ensureDefaultJSDirPath = async (): Promise<string> =>
  ensureDir(getDefaultJSDirPath(projectRootDir));

export const ensureDefaultAquaJSPath = async (): Promise<string> =>
  ensureDir(
    path.join(await ensureDefaultJSDirPath(), SRC_DIR_NAME, AQUA_DIR_NAME)
  );

// TS

export const ensureFluenceTSAppPath = async (
  fluenceTSRelativeDirPath: string
): Promise<string> =>
  path.join(
    await ensureDir(path.resolve(projectRootDir, fluenceTSRelativeDirPath)),
    APP_TS_FILE_NAME
  );

export const ensureFluenceTSDeployedAppPath = async (
  fluenceTSRelativeDirPath: string
): Promise<string> =>
  path.join(
    await ensureDir(path.resolve(projectRootDir, fluenceTSRelativeDirPath)),
    DEPLOYED_APP_TS_FILE_NAME
  );

export const getDefaultTSDirPath = (projectRootDir: string): string =>
  path.join(projectRootDir, SRC_DIR_NAME, TS_DIR_NAME);

export const ensureDefaultTSDirPath = async (): Promise<string> =>
  ensureDir(getDefaultTSDirPath(projectRootDir));

export const ensureDefaultAquaTSPath = async (): Promise<string> =>
  ensureDir(
    path.join(await ensureDefaultTSDirPath(), SRC_DIR_NAME, AQUA_DIR_NAME)
  );

export const ensureFluenceModulesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), MODULES_DIR_NAME));

export const ensureFluenceServicesDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), SERVICES_DIR_NAME));

export const ensureFluenceSpellsDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), SPELLS_DIR_NAME));

export const ensureFluenceTmpDir = async (): Promise<string> =>
  ensureDir(path.join(await ensureFluenceDir(), TMP_DIR_NAME));

export const ensureFluenceTmpAppServiceJsonPath = async (): Promise<string> =>
  path.join(await ensureFluenceTmpDir(), APP_SERVICE_JSON_FILE_NAME);

export const ensureFluenceTmpDeployJsonPath = async (): Promise<string> =>
  path.join(await ensureFluenceTmpDir(), DEPLOY_CONFIG_FILE_NAME);

export const ensureFluenceTmpConfigTomlPath = async (): Promise<string> =>
  path.join(await ensureFluenceTmpDir(), CONFIG_TOML);
