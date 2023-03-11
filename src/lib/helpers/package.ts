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

import assert from "node:assert";
import { access, mkdir, rename } from "node:fs/promises";
import { join } from "node:path";

import { commandObj } from "../commandObj.js";
import type { FluenceConfig } from "../configs/project/fluence.js";
import {
  defaultFluenceLockConfig,
  FluenceLockConfig,
  initNewReadonlyFluenceLockConfig,
} from "../configs/project/fluenceLock.js";
import { fluenceCargoDependencies, fluenceNPMDependencies } from "../const.js";
import {
  ensureUserFluenceCargoDir,
  ensureUserFluenceNpmDir,
  ensureUserFluenceTmpCargoDir,
  ensureUserFluenceTmpNpmDir,
} from "../paths.js";

import { replaceHomeDir } from "./replaceHomeDir.js";

const packageManagers = ["npm", "cargo"] as const;
type PackageManager = (typeof packageManagers)[number];

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
  packageManager: PackageManager;
};

export const handleLockConfig = async ({
  maybeFluenceLockConfig,
  name,
  version,
  packageManager,
}: HandleLockConfigArgs): Promise<void> => {
  if (maybeFluenceLockConfig === null) {
    await initNewReadonlyFluenceLockConfig({
      ...defaultFluenceLockConfig,
      [packageManager]: {
        [name]: version,
      },
    });

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
}: ResolveVersionArg):
  | {
      versionToInstall: string;
    }
  | {
      maybeVersionToCheck: string | undefined;
    } => {
  if (typeof maybeVersion === "string") {
    return {
      versionToInstall: maybeVersion,
    };
  }

  if (explicitInstallation) {
    const maybeRecommendedVersion =
      recommendedDependenciesMap[packageManager][name]?.recommendedVersion;

    if (typeof maybeRecommendedVersion === "string") {
      return {
        versionToInstall: maybeRecommendedVersion,
      };
    }

    return { maybeVersionToCheck: undefined };
  }

  const maybeVersionFromLockConfig =
    maybeFluenceLockConfig?.[packageManager]?.[name];

  if (typeof maybeVersionFromLockConfig === "string") {
    return {
      versionToInstall: maybeVersionFromLockConfig,
    };
  }

  const maybeVersionFromFluenceConfig =
    maybeFluenceConfig?.dependencies?.[packageManager]?.[name];

  if (typeof maybeVersionFromFluenceConfig === "string") {
    return {
      maybeVersionToCheck: maybeVersionFromFluenceConfig,
    };
  }

  // this should never happen because we either install a dependency explicitly
  // or we install it from the lock config or the fluence config
  // there is no other way to install a dependency
  return { maybeVersionToCheck: undefined };
};

const dependenciesPathsGettersMap: Record<
  PackageManager,
  () => [Promise<string>, Promise<string>]
> = {
  npm: () => [ensureUserFluenceNpmDir(), ensureUserFluenceTmpNpmDir()],
  cargo: () => [ensureUserFluenceCargoDir(), ensureUserFluenceTmpCargoDir()],
};

type ResolveDependencyPathAndTmpPath = {
  name: string;
  version: string;
  packageManager: PackageManager;
};

export const resolveDependencyPathAndTmpPath = async ({
  name,
  version,
  packageManager,
}: ResolveDependencyPathAndTmpPath): Promise<{
  dependencyTmpPath: string;
  dependencyPath: string;
}> => {
  const [depDirPath, depTmpDirPath] = await Promise.all(
    dependenciesPathsGettersMap[packageManager]()
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
