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

import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { commandObj } from "./commandObj.js";
import {
  AQUA_DIR_NAME,
  AQUA_SERVICES_FILE_NAME,
  CARGO_DIR_NAME,
  CONFIG_TOML,
  CARGO_TOML,
  COUNTLY_DIR_NAME,
  DEFAULT_SRC_AQUA_FILE_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
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
  DEALS_FULL_FILE_NAME,
  SPELLS_DIR_NAME,
  README_MD_FILE_NAME,
  HOSTS_FULL_FILE_NAME,
  SECRETS_DIR_NAME,
  CONFIGS_DIR_NAME,
} from "./const.js";
import { recursivelyFindFile } from "./helpers/recursivelyFindFile.js";
import { stringifyUnknown } from "./helpers/utils.js";
import { FLUENCE_USER_DIR } from "./setupEnvironment.js";

export const validatePath = async (path: string): Promise<string | true> => {
  try {
    await access(path);
    return true;
  } catch (error) {
    return stringifyUnknown(error);
  }
};

export const ensureDir = async (dirPath: string): Promise<string> => {
  await mkdir(dirPath, { recursive: true });
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

  return ensureDir(join(homedir(), DOT_FLUENCE_DIR_NAME));
};

export const getUserCountlyDir = async (): Promise<string> => {
  return join(await ensureUserFluenceDir(), COUNTLY_DIR_NAME, COUNTLY_DIR_NAME);
};

export const ensureUserFluenceTmpNpmDir = async (): Promise<string> => {
  return ensureDir(
    join(await ensureUserFluenceDir(), TMP_DIR_NAME, NPM_DIR_NAME),
  );
};

export const ensureUserFluenceNpmDir = async (): Promise<string> => {
  return ensureDir(join(await ensureUserFluenceDir(), NPM_DIR_NAME));
};

export const ensureUserFluenceTmpCargoDir = async (): Promise<string> => {
  return ensureDir(
    join(await ensureUserFluenceDir(), TMP_DIR_NAME, CARGO_DIR_NAME),
  );
};

export const ensureUserFluenceCargoDir = async (): Promise<string> => {
  return ensureDir(join(await ensureUserFluenceDir(), CARGO_DIR_NAME));
};

export const ensureUserFluenceSecretsDir = async (): Promise<string> => {
  return ensureDir(join(await ensureUserFluenceDir(), SECRETS_DIR_NAME));
};

// Project paths:

const initialCwd = process.cwd();

export const recursivelyFindProjectRootDir = async (
  initialPath: string,
): Promise<string> => {
  const fluenceConfigPath = await recursivelyFindFile(
    FLUENCE_CONFIG_FULL_FILE_NAME,
    initialPath,
  );

  if (fluenceConfigPath === null) {
    return initialCwd;
  }

  return dirname(fluenceConfigPath);
};

export let projectRootDir = initialCwd;

export const setProjectRootDir = (dir: string): void => {
  projectRootDir = dir;
};

const ensureSrcAquaDir = async (): Promise<string> => {
  return ensureDir(join(projectRootDir, SRC_DIR_NAME, AQUA_DIR_NAME));
};

export const ensureSrcAquaMainPath = async (): Promise<string> => {
  return join(await ensureSrcAquaDir(), DEFAULT_SRC_AQUA_FILE_NAME);
};

export const ensureSrcServicesDir = async (): Promise<string> => {
  return ensureDir(join(projectRootDir, SRC_DIR_NAME, SERVICES_DIR_NAME));
};

export const ensureSrcModulesDir = async (): Promise<string> => {
  return ensureDir(join(projectRootDir, SRC_DIR_NAME, MODULES_DIR_NAME));
};

export const ensureSrcSpellsDir = async (): Promise<string> => {
  return ensureDir(join(projectRootDir, SRC_DIR_NAME, SPELLS_DIR_NAME));
};

const ensureVSCodeDir = async (): Promise<string> => {
  return ensureDir(join(projectRootDir, VSCODE_DIR_NAME));
};

export const ensureVSCodeSettingsJsonPath = async (): Promise<string> => {
  return join(await ensureVSCodeDir(), SETTINGS_JSON_FILE_NAME);
};

export const ensureVSCodeExtensionsJsonPath = async (): Promise<string> => {
  return join(await ensureVSCodeDir(), EXTENSIONS_JSON_FILE_NAME);
};

export const getGitignorePath = (): string => {
  return join(projectRootDir, GITIGNORE_FILE_NAME);
};

export const getCargoTomlPath = (): string => {
  return join(projectRootDir, CARGO_TOML);
};

export const getREADMEPath = (): string => {
  return join(projectRootDir, README_MD_FILE_NAME);
};

// Project .fluence paths:

export const getFluenceDir = (): string => {
  return join(projectRootDir, DOT_FLUENCE_DIR_NAME);
};

const ensureFluenceDir = async (): Promise<string> => {
  return ensureDir(getFluenceDir());
};

export const getFluenceAquaDir = (): string => {
  return join(getFluenceDir(), AQUA_DIR_NAME);
};

const ensureFluenceAquaDir = async (): Promise<string> => {
  return ensureDir(getFluenceAquaDir());
};

export const ensureFluenceAquaServicesPath = async (): Promise<string> => {
  return join(await ensureFluenceAquaDir(), AQUA_SERVICES_FILE_NAME);
};

export const ensureFluenceAquaHostsPath = async (): Promise<string> => {
  return join(await ensureFluenceAquaDir(), HOSTS_FULL_FILE_NAME);
};

export const ensureFluenceAquaDealsPath = async (): Promise<string> => {
  return join(await ensureFluenceAquaDir(), DEALS_FULL_FILE_NAME);
};

export const getFluenceSecretsDir = (): string => {
  return join(getFluenceDir(), SECRETS_DIR_NAME);
};

export const ensureFluenceSecretsDir = async (): Promise<string> => {
  return ensureDir(getFluenceSecretsDir());
};

export async function getSecretsPathForReading(isUser: boolean) {
  return isUser ? await ensureUserFluenceSecretsDir() : getFluenceSecretsDir();
}

export async function getSecretsPathForWriting(isUser: boolean) {
  return isUser
    ? await ensureUserFluenceSecretsDir()
    : await ensureFluenceSecretsDir();
}

export const ensureUserFluenceConfigsDir = async (): Promise<string> => {
  return ensureDir(join(getFluenceDir(), CONFIGS_DIR_NAME));
};

// JS

// exported for tests
export const getDefaultJSDirPath = (projectRootDir: string): string => {
  return join(projectRootDir, SRC_DIR_NAME, JS_DIR_NAME);
};

export const ensureDefaultJSDirPath = async (): Promise<string> => {
  return ensureDir(getDefaultJSDirPath(projectRootDir));
};

export const ensureDefaultJSSrcPath = async (): Promise<string> => {
  return ensureDir(join(await ensureDefaultJSDirPath(), SRC_DIR_NAME));
};

export const ensureDefaultAquaJSPath = async (): Promise<string> => {
  return ensureDir(join(await ensureDefaultJSSrcPath(), AQUA_DIR_NAME));
};

// TS

// exported for tests
export const getDefaultTSDirPath = (projectRootDir: string): string => {
  return join(projectRootDir, SRC_DIR_NAME, TS_DIR_NAME);
};

export const ensureDefaultTSDirPath = async (): Promise<string> => {
  return ensureDir(getDefaultTSDirPath(projectRootDir));
};

export const ensureDefaultTSSrcPath = async (): Promise<string> => {
  return ensureDir(join(await ensureDefaultTSDirPath(), SRC_DIR_NAME));
};

export const ensureDefaultAquaTSPath = async (): Promise<string> => {
  return ensureDir(join(await ensureDefaultTSSrcPath(), AQUA_DIR_NAME));
};

export const ensureFluenceModulesDir = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceDir(), MODULES_DIR_NAME));
};

export const ensureFluenceServicesDir = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceDir(), SERVICES_DIR_NAME));
};

export const ensureFluenceSpellsDir = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceDir(), SPELLS_DIR_NAME));
};

const ensureFluenceTmpDir = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceDir(), TMP_DIR_NAME));
};

export const ensureFluenceTmpConfigTomlPath = async (): Promise<string> => {
  return join(await ensureFluenceTmpDir(), CONFIG_TOML);
};
