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

import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import type { FluenceLockConfig } from "./configs/project/fluenceLock.js";
import {
  AQUA_LIB_NPM_DEPENDENCY,
  AQUA_LIB_RECOMMENDED_VERSION,
  DOT_BIN_DIR_NAME,
  fluenceNPMDependencies,
  NODE_MODULES_DIR_NAME,
} from "./const.js";
import { addCountlyLog } from "./countly.js";
import { execPromise } from "./execPromise.js";
import {
  splitPackageNameAndVersion,
  handleLockConfig,
  resolveDependencyPathAndTmpPath,
  resolveVersionToInstall,
  handleInstallation,
  handleFluenceConfig,
} from "./helpers/package.js";
import { replaceHomeDir } from "./helpers/replaceHomeDir.js";

export const getLatestVersionOfNPMDependency = async (
  name: string
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
};

const installNpmDependency = async ({
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
    await mkdir(dependencyTmpPath, { recursive: true });

    await writeFile(
      join(dependencyTmpPath, "package.json"),
      JSON.stringify({ dependencies: { [name]: version } })
    );

    await execPromise({
      command: "npx",
      args: ["pnpm", "i"],
      spinnerMessage: `Installing ${name}@${version} to ${replaceHomeDir(
        dependencyPath
      )}`,
      options: { cwd: dependencyTmpPath },
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
  force?: boolean | undefined;
  explicitInstallation?: boolean;
};

export const ensureNpmDependency = async ({
  nameAndVersion,
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  force = false,
  explicitInstallation = false,
}: EnsureNpmDependencyArg): Promise<string> => {
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const resolveVersionToInstallResult = resolveVersionToInstall({
    name,
    maybeVersion,
    explicitInstallation,
    maybeFluenceLockConfig,
    maybeFluenceConfig,
    packageManager: "npm",
  });

  const version =
    "versionToInstall" in resolveVersionToInstallResult
      ? resolveVersionToInstallResult.versionToInstall
      : await getLatestVersionOfNPMDependency(
          resolveVersionToInstallResult.maybeVersionToCheck === undefined
            ? name
            : `${name}@${resolveVersionToInstallResult.maybeVersionToCheck}`
        );

  const maybeNpmDependencyInfo = fluenceNPMDependencies[name];

  const { dependencyPath, dependencyTmpPath } =
    await resolveDependencyPathAndTmpPath({
      name,
      packageManager: "npm",
      version,
    });

  await handleInstallation({
    force,
    dependencyPath,
    dependencyTmpPath,
    explicitInstallation,
    name,
    version,
    installDependency: () =>
      installNpmDependency({
        dependencyPath,
        dependencyTmpPath,
        name,
        version,
      }),
  });

  if (maybeFluenceConfig !== null) {
    const versionFromArgs = maybeVersion ?? version;

    if (versionFromArgs !== maybeFluenceConfig?.dependencies?.npm?.[name]) {
      await handleFluenceConfig({
        fluenceConfig: maybeFluenceConfig,
        name,
        packageManager: "npm",
        versionFromArgs,
      });
    }

    if (version !== maybeFluenceLockConfig?.npm?.[name]) {
      await handleLockConfig({
        maybeFluenceLockConfig,
        name,
        version,
        packageManager: "npm",
      });
    }
  }

  addCountlyLog(`Using ${name}@${version} npm dependency`);

  return maybeNpmDependencyInfo?.bin === undefined
    ? join(dependencyPath, NODE_MODULES_DIR_NAME)
    : join(
        dependencyPath,
        NODE_MODULES_DIR_NAME,
        DOT_BIN_DIR_NAME,
        maybeNpmDependencyInfo.bin
      );
};

type InstallAllNPMDependenciesArg = {
  maybeFluenceConfig: FluenceConfig | null;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  force?: boolean | undefined;
};

export const installAllNPMDependencies = async ({
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  force,
}: InstallAllNPMDependenciesArg): Promise<string[]> => {
  const dependenciesToEnsure = Object.entries(
    maybeFluenceConfig?.dependencies?.npm ?? {}
  );

  const hasFluenceConfigAquaLibDependency = dependenciesToEnsure.some(
    ([name]) => name === AQUA_LIB_NPM_DEPENDENCY
  );

  if (!hasFluenceConfigAquaLibDependency) {
    // ensure aqua-lib dependency when it's not specified in fluence config
    // or when running without a project
    dependenciesToEnsure.push([
      AQUA_LIB_NPM_DEPENDENCY,
      AQUA_LIB_RECOMMENDED_VERSION,
    ]);
  }

  await execPromise({ command: "npx", args: ["pnpm", "--help"] });

  return Promise.all(
    dependenciesToEnsure.map(([name, version]) =>
      ensureNpmDependency({
        nameAndVersion: `${name}@${version}`,
        maybeFluenceConfig,
        maybeFluenceLockConfig,
        force,
      })
    )
  );
};
