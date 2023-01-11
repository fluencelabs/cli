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
import { access, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";

import type { FluenceConfig } from "../configs/project/fluence";
import {
  defaultFluenceLockConfig,
  FluenceLockConfig,
  initNewReadonlyFluenceLockConfig,
} from "../configs/project/fluenceLock";
import type { CommandObj } from "../const";
import { fluenceNPMDependencies } from "../npm";
import {
  ensureUserFluenceCargoDir,
  ensureUserFluenceNpmDir,
  ensureUserFluenceTmpCargoDir,
  ensureUserFluenceTmpNpmDir,
} from "../paths";
import { fluenceCargoDependencies } from "../rust";

import { replaceHomeDir } from "./replaceHomeDir";

const packageManagers = ["npm", "cargo"] as const;
type PackageManager = typeof packageManagers[number];

type HandleFluenceConfigArgs = {
  fluenceConfig: FluenceConfig;
  name: string;
  versionFromArgs: string;
  packageManager: PackageManager;
};

export const handleFluenceConfig = async ({
  fluenceConfig,
  name,
  versionFromArgs,
  packageManager,
}: HandleFluenceConfigArgs): Promise<void> => {
  if (fluenceConfig.dependencies === undefined) {
    fluenceConfig.dependencies = {};
  }

  if (fluenceConfig.dependencies[packageManager] === undefined) {
    fluenceConfig.dependencies[packageManager] = {};
  }

  // Disabled because we made sure it's not undefined above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  fluenceConfig.dependencies[packageManager]![name] = versionFromArgs;
  await fluenceConfig.$commit();
};

type HandleLockConfigArgs = {
  maybeFluenceLockConfig: FluenceLockConfig | null;
  name: string;
  version: string;
  commandObj: CommandObj;
  packageManager: PackageManager;
};

export const handleLockConfig = async ({
  maybeFluenceLockConfig,
  name,
  version,
  commandObj,
  packageManager,
}: HandleLockConfigArgs): Promise<void> => {
  if (maybeFluenceLockConfig === null) {
    await initNewReadonlyFluenceLockConfig(
      {
        ...defaultFluenceLockConfig,
        [packageManager]: {
          [name]: version,
        },
      },
      commandObj
    );

    return;
  }

  const fluenceLockConfig = maybeFluenceLockConfig;

  if (fluenceLockConfig[packageManager] === undefined) {
    fluenceLockConfig[packageManager] = {};
  }

  // Disabled because we made sure it's not undefined above
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  fluenceLockConfig[packageManager]![name] = version;
  await fluenceLockConfig.$commit();
};

const recommendedDependenciesMap: Record<
  PackageManager,
  Record<string, { recommendedVersion: string }>
> = {
  npm: fluenceNPMDependencies,
  cargo: fluenceCargoDependencies,
};

type ResolveVersionArg = {
  name: string;
  maybeVersion: string | undefined;
  explicitInstallation: boolean;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  maybeFluenceConfig: FluenceConfig | null;
  packageManager: PackageManager;
};

export const resolveVersionToInstall = ({
  name,
  maybeVersion,
  explicitInstallation,
  maybeFluenceLockConfig,
  maybeFluenceConfig,
  packageManager,
}: ResolveVersionArg): string | undefined => {
  if (typeof maybeVersion === "string") {
    return maybeVersion;
  }

  if (explicitInstallation) {
    return undefined;
  }

  const versionFromLockConfig =
    maybeFluenceLockConfig?.[packageManager]?.[name];

  if (versionFromLockConfig !== undefined) {
    return versionFromLockConfig;
  }

  const versionFromFluenceConfig =
    maybeFluenceConfig?.dependencies?.[packageManager]?.[name];

  if (versionFromFluenceConfig !== undefined) {
    return versionFromFluenceConfig;
  }

  return recommendedDependenciesMap[packageManager][name]?.recommendedVersion;
};

const dependenciesPathsGettersMap: Record<
  PackageManager,
  (commandObj: CommandObj) => [Promise<string>, Promise<string>]
> = {
  npm: (commandObj: CommandObj) => [
    ensureUserFluenceNpmDir(commandObj),
    ensureUserFluenceTmpNpmDir(commandObj),
  ],
  cargo: (commandObj: CommandObj) => [
    ensureUserFluenceCargoDir(commandObj),
    ensureUserFluenceTmpCargoDir(commandObj),
  ],
};

type ResolveDependencyPathAndTmpPath = {
  commandObj: CommandObj;
  name: string;
  version: string;
  packageManager: PackageManager;
};

export const resolveDependencyPathAndTmpPath = async ({
  commandObj,
  name,
  version,
  packageManager,
}: ResolveDependencyPathAndTmpPath): Promise<{
  dependencyTmpPath: string;
  dependencyPath: string;
}> => {
  const [depDirPath, depTmpDirPath] = await Promise.all(
    dependenciesPathsGettersMap[packageManager](commandObj)
  );

  const dependencyPathEnding = join(...name.split("/"), version);
  return {
    dependencyTmpPath: join(depTmpDirPath, dependencyPathEnding),
    dependencyPath: join(depDirPath, dependencyPathEnding),
  };
};

type HandleInstallationArg = {
  force: boolean;
  installDependency: () => Promise<void>;
  dependencyPath: string;
  dependencyTmpPath: string;
  commandObj: CommandObj;
  name: string;
  version: string;
  explicitInstallation: boolean;
};

export const handleInstallation = async ({
  force,
  installDependency,
  dependencyPath,
  dependencyTmpPath,
  explicitInstallation,
  commandObj,
  name,
  version,
}: HandleInstallationArg): Promise<void> => {
  const installAndMoveToDependencyPath = async (): Promise<void> => {
    await installDependency();
    await mkdir(dependencyPath, { recursive: true });
    await rename(dependencyTmpPath, dependencyPath);
  };

  if (force) {
    await installAndMoveToDependencyPath();
  } else {
    try {
      // if dependency is already installed it will be there
      await access(dependencyPath);
    } catch {
      await installAndMoveToDependencyPath();
    }
  }

  if (explicitInstallation) {
    commandObj.log(
      `Successfully installed ${name}@${version} to ${replaceHomeDir(
        dependencyPath
      )}`
    );
  }
};

export const splitPackageNameAndVersion = (
  packageNameAndMaybeVersion: string
): [string] | [string, string] => {
  const hasVersion = /.+@.+/.test(packageNameAndMaybeVersion);

  if (!hasVersion) {
    const packageName = packageNameAndMaybeVersion;

    return [packageName];
  }

  const packageNameAndVersionArray = packageNameAndMaybeVersion.split("@");
  const version = packageNameAndVersionArray.pop();
  assert(version !== undefined);
  const packageName = packageNameAndVersionArray.join("@");

  return [packageName, version];
};
