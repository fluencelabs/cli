/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { access, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { commandObj } from "./commandObj.js";
import {
  COUNTLY_DIR_NAME,
  DOT_FLUENCE_DIR_NAME,
  GITIGNORE_FILE_NAME,
  SECRETS_DIR_NAME,
  CONFIGS_DIR_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  CCP_CONFIGS_DIR_NAME,
  BACKUPS_DIR_NAME,
  ENV_CONFIG_FULL_FILE_NAME,
  USER_CONFIG_FULL_FILE_NAME,
  DOCKER_COMPOSE_FULL_FILE_NAME,
} from "./const.js";
import { recursivelyFindFile } from "./helpers/recursivelyFindFile.js";
import { stringifyUnknown } from "./helpers/stringifyUnknown.js";
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

const ensureUserFluenceDir = (): Promise<string> => {
  const globalFluenceDirPathFromEnv = process.env[FLUENCE_USER_DIR];

  if (typeof globalFluenceDirPathFromEnv === "string") {
    return ensureDir(globalFluenceDirPathFromEnv);
  }

  if (commandObj.config.windows) {
    return ensureDir(commandObj.config.configDir);
  }

  return ensureDir(join(homedir(), DOT_FLUENCE_DIR_NAME));
};

export async function getUserConfigPath(): Promise<string> {
  return join(await ensureUserFluenceDir(), USER_CONFIG_FULL_FILE_NAME);
}

export const getUserCountlyDir = async (): Promise<string> => {
  return join(await ensureUserFluenceDir(), COUNTLY_DIR_NAME, COUNTLY_DIR_NAME);
};

// Project paths:

const initialCwd = process.cwd();

export async function recursivelyFindProjectRootDir(
  initialPath: string,
): Promise<string> {
  const providerConfigPath = await recursivelyFindFile(
    PROVIDER_CONFIG_FULL_FILE_NAME,
    initialPath,
  );

  if (providerConfigPath === null) {
    return initialCwd;
  }

  return dirname(providerConfigPath);
}

export let projectRootDir = initialCwd;

export const setProjectRootDir = (dir: string): void => {
  projectRootDir = dir;
};

export function getProviderConfigPath(): string {
  return join(projectRootDir, PROVIDER_CONFIG_FULL_FILE_NAME);
}

export const getGitignorePath = (): string => {
  return join(projectRootDir, GITIGNORE_FILE_NAME);
};

// Project .fluence paths:

export const getFluenceDir = (cwd?: string): string => {
  return join(cwd ?? projectRootDir, DOT_FLUENCE_DIR_NAME);
};

export async function ensureDockerComposeConfigPath(): Promise<string> {
  return join(await ensureFluenceDir(), DOCKER_COMPOSE_FULL_FILE_NAME);
}

export function getEnvConfigPath(): string {
  return join(getFluenceDir(), ENV_CONFIG_FULL_FILE_NAME);
}

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

export function getFluenceSecretsDir(): string {
  return join(getFluenceDir(), SECRETS_DIR_NAME);
}

async function ensureFluenceSecretsDir(): Promise<string> {
  return ensureDir(getFluenceSecretsDir());
}

export function getFluenceBackupsDir(): string {
  return join(getFluenceDir(), BACKUPS_DIR_NAME);
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
