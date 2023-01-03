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

import assert from "node:assert";
import { rm } from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";

import type { FluenceConfig } from "./configs/project/fluence";
import type { FluenceLockConfig } from "./configs/project/fluenceLock";
import {
  AQUA_NPM_DEPENDENCY,
  AQUA_RECOMMENDED_VERSION,
  CommandObj,
  DOT_BIN_DIR_NAME,
  NODE_MODULES_DIR_NAME,
} from "./const";
import { addCountlyLog } from "./countly";
import { execPromise } from "./execPromise";
import {
  splitPackageNameAndVersion,
  handleLockConfig,
  resolveDependencyPathAndTmpPath,
  resolveVersionToInstall,
  handleInstallation,
} from "./helpers/package";
import { replaceHomeDir } from "./helpers/replaceHomeDir";

type NPMDependencyInfo = { recommendedVersion: string; bin?: string };

export const fluenceNPMDependencies: Record<string, NPMDependencyInfo> = {
  [AQUA_NPM_DEPENDENCY]: {
    recommendedVersion: AQUA_RECOMMENDED_VERSION,
    bin: "aqua",
  },
};

export const getLatestVersionOfNPMDependency = async (
  name: string,
  commandObj: CommandObj
): Promise<string> => {
  try {
    return (
      await execPromise({ command: "npm", args: ["show", name, "version"] })
    ).trim();
  } catch (error) {
    commandObj.error(
      `Failed to get latest version of ${color.yellow(
        name
      )} from npm registry. Please make sure ${color.yellow(
        name
      )} is spelled correctly\n${String(error)}`
    );
  }
};

type InstallNpmDependencyArg = {
  name: string;
  version: string;
  dependencyTmpPath: string;
  dependencyPath: string;
  commandObj: CommandObj;
};

const installNpmDependency = async ({
  commandObj,
  dependencyPath,
  dependencyTmpPath,
  name,
  version,
}: InstallNpmDependencyArg): Promise<void> => {
  try {
    // cleanup before installation
    await Promise.allSettled([
      rm(dependencyTmpPath, { recursive: true }),
      rm(dependencyPath, { recursive: true }),
    ]);
  } catch {}

  try {
    await execPromise({
      command: "npm",
      args: ["i", `${name}@${version}`],
      flags: { prefix: dependencyTmpPath },
      message: `Installing ${name}@${version} to ${replaceHomeDir(
        dependencyPath
      )}`,
      printOutput: true,
    });
  } catch (error) {
    commandObj.error(
      `Not able to install ${name}@${version} to ${replaceHomeDir(
        dependencyPath
      )}. Please make sure ${color.yellow(
        name
      )} is spelled correctly or try to install a different version of the dependency using ${color.yellow(
        `fluence dependency npm install ${name}@<version>`
      )} command.\n${String(error)}`
    );
  }
};

type EnsureNpmDependencyArg = {
  nameAndVersion: string;
  maybeFluenceConfig: FluenceConfig | null;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  commandObj: CommandObj;
  force?: boolean | undefined;
  explicitInstallation?: boolean;
};

export const ensureNpmDependency = async ({
  nameAndVersion,
  commandObj,
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  force = false,
  explicitInstallation = false,
}: EnsureNpmDependencyArg): Promise<string> => {
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const versionToInstall = resolveVersionToInstall({
    name,
    maybeVersion,
    explicitInstallation,
    maybeFluenceLockConfig,
    maybeFluenceConfig,
    packageManager: "npm",
  });

  const version = await getLatestVersionOfNPMDependency(
    versionToInstall === undefined ? name : `${name}@${versionToInstall}`,
    commandObj
  );

  const maybeNpmDependencyInfo = fluenceNPMDependencies[name];

  const { dependencyPath, dependencyTmpPath } =
    await resolveDependencyPathAndTmpPath({
      commandObj,
      name,
      packageManager: "npm",
      version,
    });

  await handleInstallation({
    force,
    dependencyPath,
    dependencyTmpPath,
    commandObj,
    explicitInstallation,
    name,
    version,
    installDependency: () =>
      installNpmDependency({
        commandObj,
        dependencyPath,
        dependencyTmpPath,
        name,
        version,
      }),
  });

  await handleLockConfig({
    commandObj,
    isFluenceProject: maybeFluenceConfig !== null,
    maybeFluenceLockConfig,
    name,
    version,
    packageManager: "npm",
  });

  addCountlyLog(`Using ${name}@${version} npm dependency`);

  return maybeNpmDependencyInfo?.bin === undefined
    ? path.join(dependencyPath, NODE_MODULES_DIR_NAME)
    : path.join(
        dependencyPath,
        NODE_MODULES_DIR_NAME,
        DOT_BIN_DIR_NAME,
        maybeNpmDependencyInfo.bin
      );
};

type InstallAllDependenciesArg = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfig;
  fluenceLockConfig: FluenceLockConfig;
  force?: boolean | undefined;
};

export const installAllNPMDependenciesFromFluenceConfig = async ({
  fluenceConfig,
  commandObj,
  fluenceLockConfig,
  force,
}: InstallAllDependenciesArg): Promise<string[]> => {
  const dependencyPaths = [];

  for (const [name, version] of Object.entries(
    fluenceConfig.dependencies.npm
  )) {
    assert(name !== undefined && version !== undefined);

    dependencyPaths.push(
      // Not installing dependencies in parallel
      // for npm logs to be clearly readable
      // eslint-disable-next-line no-await-in-loop
      await ensureNpmDependency({
        nameAndVersion: `${name}@${version}`,
        commandObj,
        maybeFluenceConfig: fluenceConfig,
        maybeFluenceLockConfig: fluenceLockConfig,
        force,
      })
    );
  }

  return dependencyPaths;
};
