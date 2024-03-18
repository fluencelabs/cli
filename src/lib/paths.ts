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
  MODULE_VOLUMES_DIR_NAME,
  MODULE_VOLUMES_SERVICES_DIR_NAME,
  CARGO_TOML,
  COUNTLY_DIR_NAME,
  MAIN_AQUA_FILE_NAME,
  EXTENSIONS_JSON_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  GITIGNORE_FILE_NAME,
  MODULES_DIR_NAME,
  SERVICES_DIR_NAME,
  SRC_DIR_NAME,
  TMP_DIR_NAME,
  VSCODE_DIR_NAME,
  DEALS_FULL_FILE_NAME,
  SPELLS_DIR_NAME,
  README_MD_FILE_NAME,
  HOSTS_FULL_FILE_NAME,
  SECRETS_DIR_NAME,
  INDEX_JS_FILE_NAME,
  INDEX_TS_FILE_NAME,
  PACKAGE_JSON_FILE_NAME,
  TS_CONFIG_FILE_NAME,
  FRONTEND_DIR_NAME,
  COMPILED_AQUA_DIR_NAME,
  INDEX_HTML_FILE_NAME,
  CONFIGS_DIR_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  AQUA_DEPENDENCIES_DIR_NAME,
  GATEWAY_DIR_NAME,
  SERVER_JS_FILE_NAME,
  SERVER_TS_FILE_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  CCP_CONFIGS_DIR_NAME,
  SERVICE_CONFIGS_DIR_NAME,
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

export function getProviderConfigPath(): string {
  return join(projectRootDir, PROVIDER_CONFIG_FULL_FILE_NAME);
}

export function getAquaDir(cwd?: string): string {
  return join(getSrcPath(cwd), AQUA_DIR_NAME);
}

export async function ensureAquaDir(): Promise<string> {
  return ensureDir(getAquaDir());
}

export const getAquaMainPath = (cwd?: string): string => {
  return join(getAquaDir(cwd), MAIN_AQUA_FILE_NAME);
};

export const ensureAquaMainPath = async (): Promise<string> => {
  return join(await ensureAquaDir(), MAIN_AQUA_FILE_NAME);
};

export const getServicesDir = (cwd?: string): string => {
  return join(getSrcPath(cwd), SERVICES_DIR_NAME);
};

export const ensureServicesDir = async (): Promise<string> => {
  return ensureDir(getServicesDir());
};

export const ensureModulesDir = async (cwd?: string): Promise<string> => {
  return ensureDir(join(getSrcPath(cwd), MODULES_DIR_NAME));
};

export const getSpellsDir = (cwd?: string): string => {
  return join(getSrcPath(cwd), SPELLS_DIR_NAME);
};

export const ensureSpellsDir = async (): Promise<string> => {
  return ensureDir(getSpellsDir());
};

const ensureVSCodeDir = async (): Promise<string> => {
  return ensureDir(join(projectRootDir, VSCODE_DIR_NAME));
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

export const getFluenceDir = (cwd?: string): string => {
  return join(cwd ?? projectRootDir, DOT_FLUENCE_DIR_NAME);
};

const ensureFluenceDir = async (): Promise<string> => {
  return ensureDir(getFluenceDir());
};

export async function ensureProviderSecretsConfigPath(): Promise<string> {
  return join(await ensureFluenceDir(), PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME);
}

export async function ensureProviderArtifactsConfigPath(): Promise<string> {
  return join(
    await ensureFluenceDir(),
    PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  );
}

export const getFluenceAquaDir = (cwd?: string): string => {
  return join(getFluenceDir(cwd), AQUA_DIR_NAME);
};

const ensureFluenceAquaDir = async (): Promise<string> => {
  return ensureDir(getFluenceAquaDir());
};

export const getFluenceAquaServicesPath = (cwd?: string): string => {
  return join(getFluenceAquaDir(cwd), AQUA_SERVICES_FILE_NAME);
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

export function getFluenceSecretsDir(): string {
  return join(getFluenceDir(), SECRETS_DIR_NAME);
}

async function ensureFluenceSecretsDir(): Promise<string> {
  return ensureDir(getFluenceSecretsDir());
}

export const ensureFluenceSecretsFilePath = async (
  name: string,
): Promise<string> => {
  return join(await ensureFluenceSecretsDir(), `${name}.txt`);
};

export async function ensureFluenceConfigsDir(): Promise<string> {
  return ensureDir(join(getFluenceDir(), CONFIGS_DIR_NAME));
}

export async function ensureFluenceCCPConfigsDir(): Promise<string> {
  return ensureDir(join(getFluenceDir(), CCP_CONFIGS_DIR_NAME));
}

export async function getSecretsPathForReading(isUser: boolean) {
  return isUser ? await ensureUserFluenceSecretsDir() : getFluenceSecretsDir();
}

export async function getSecretsPathForWriting(isUser: boolean) {
  return isUser
    ? await ensureUserFluenceSecretsDir()
    : await ensureFluenceSecretsDir();
}

export const getSrcPath = (cwd?: string): string => {
  return join(cwd ?? projectRootDir, SRC_DIR_NAME);
};

export const getFrontendPath = (cwd?: string): string => {
  return join(getSrcPath(cwd), FRONTEND_DIR_NAME);
};

export const getFrontendSrcPath = (cwd?: string): string => {
  return join(getFrontendPath(cwd), SRC_DIR_NAME);
};

export const getGatewayPath = (cwd?: string): string => {
  return join(getSrcPath(cwd), GATEWAY_DIR_NAME);
};

export const getGatewaySrcPath = (cwd?: string): string => {
  return join(getGatewayPath(cwd), SRC_DIR_NAME);
};

export const getFrontendIndexTSorJSPath = (
  isJs: boolean,
  cwd?: string,
): string => {
  return join(
    getFrontendSrcPath(cwd),
    isJs ? INDEX_JS_FILE_NAME : INDEX_TS_FILE_NAME,
  );
};

export const getGatewayServerTSorJSPath = (
  isJs: boolean,
  cwd?: string,
): string => {
  return join(
    getGatewaySrcPath(cwd),
    isJs ? SERVER_JS_FILE_NAME : SERVER_TS_FILE_NAME,
  );
};

export const getFrontendPackageJSONPath = (): string => {
  return join(getFrontendPath(), PACKAGE_JSON_FILE_NAME);
};

export const getGatewayPackageJSONPath = (): string => {
  return join(getGatewayPath(), PACKAGE_JSON_FILE_NAME);
};

export const getFrontendTsConfigPath = (): string => {
  return join(getFrontendPath(), TS_CONFIG_FILE_NAME);
};

export const getGatewayTsConfigPath = (): string => {
  return join(getGatewayPath(), TS_CONFIG_FILE_NAME);
};

export const getFrontendCompiledAquaPath = (): string => {
  return join(getFrontendSrcPath(), COMPILED_AQUA_DIR_NAME);
};

export const ensureFrontendCompiledAquaPath = async (): Promise<string> => {
  return ensureDir(getFrontendCompiledAquaPath());
};

export const getGatewayCompiledAquaPath = (): string => {
  return join(getGatewaySrcPath(), COMPILED_AQUA_DIR_NAME);
};

export const ensureGatewayCompiledAquaPath = async (): Promise<string> => {
  return ensureDir(getGatewayCompiledAquaPath());
};

export const getIndexHTMLPath = (): string => {
  return join(getFrontendPath(), INDEX_HTML_FILE_NAME);
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

export const ensureFluenceTmpDir = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceDir(), TMP_DIR_NAME));
};

export const ensureFluenceTmpVolumesParticlesDir =
  async (): Promise<string> => {
    return ensureDir(
      join(await ensureFluenceTmpDir(), MODULE_VOLUMES_DIR_NAME, "particles"),
    );
  };

export const ensureFluenceTmpVolumesServiceDir = async (
  serviceName: string,
  mappedDirPath: string,
): Promise<string> => {
  return ensureDir(
    join(
      await ensureFluenceTmpDir(),
      MODULE_VOLUMES_DIR_NAME,
      MODULE_VOLUMES_SERVICES_DIR_NAME,
      serviceName,
      "service",
      mappedDirPath,
    ),
  );
};

export const ensureFluenceTmpVolumesModuleDir = async (
  serviceName: string,
  moduleName: string,
  mappedDirPath: string,
): Promise<string> => {
  return ensureDir(
    join(
      await ensureFluenceTmpDir(),
      MODULE_VOLUMES_DIR_NAME,
      MODULE_VOLUMES_SERVICES_DIR_NAME,
      serviceName,
      "modules",
      moduleName,
      mappedDirPath,
    ),
  );
};

export const ensureFluenceServiceConfigsDir = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceDir(), SERVICE_CONFIGS_DIR_NAME));
};

export const ensureFluenceTmpModulePath = async (): Promise<string> => {
  return ensureDir(join(await ensureFluenceTmpDir(), "module"));
};

export async function ensureFluenceAquaDependenciesPath(): Promise<string> {
  return ensureDir(join(await ensureFluenceDir(), AQUA_DEPENDENCIES_DIR_NAME));
}

export async function getFluenceAquaDependenciesPackageJsonPath(): Promise<string> {
  return join(
    await ensureFluenceAquaDependenciesPath(),
    PACKAGE_JSON_FILE_NAME,
  );
}
