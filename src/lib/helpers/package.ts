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
import { access, mkdir, rename, rm } from "node:fs/promises";
import { join } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import versions from "../../versions.json" assert { type: "json" };
import { commandObj } from "../commandObj.js";
import type {
  FluenceConfig,
  FluenceConfigReadonly,
} from "../configs/project/fluence.js";
import { initReadonlyUserConfig, userConfig } from "../configs/user/config.js";
import {
  fluenceCargoDependencies,
  fluenceNPMDependencies,
  isFluenceCargoDependency,
  isFluenceNPMDependency,
} from "../const.js";
import {
  ensureUserFluenceCargoDir,
  ensureUserFluenceNpmDir,
  ensureUserFluenceTmpCargoDir,
  ensureUserFluenceTmpNpmDir,
} from "../paths.js";

import { replaceHomeDir } from "./replaceHomeDir.js";
import { isExactVersion } from "./validations.js";

const packageManagers = ["npm", "cargo"] as const;
type PackageManager = (typeof packageManagers)[number];

type UpdateFluenceConfigIfVersionChangedArgs = {
  maybeFluenceConfig: FluenceConfig | null;
  name: string;
  version: string;
  packageManager: PackageManager;
};

const updateFluenceConfigIfVersionChanged = async ({
  maybeFluenceConfig,
  name,
  version,
  packageManager,
}: UpdateFluenceConfigIfVersionChangedArgs): Promise<void> => {
  if (
    maybeFluenceConfig === null ||
    version ===
      (maybeFluenceConfig.dependencies?.[packageManager]?.[name] ??
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        versions[packageManager][name])
  ) {
    return;
  }

  if (maybeFluenceConfig.dependencies === undefined) {
    maybeFluenceConfig.dependencies = {};
  }

  const dependenciesForPackageManager =
    maybeFluenceConfig.dependencies[packageManager] ?? {};

  dependenciesForPackageManager[name] = version;

  maybeFluenceConfig.dependencies[packageManager] =
    dependenciesForPackageManager;

  await maybeFluenceConfig.$commit();
};

type UpdateUserConfigIfVersionChangedArgs = {
  name: string;
  version: string;
  packageManager: PackageManager;
};

const updateUserConfigIfVersionChanged = async ({
  name,
  version,
  packageManager,
}: UpdateUserConfigIfVersionChangedArgs): Promise<void> => {
  if (
    version ===
    (userConfig.dependencies?.[packageManager]?.[name] ??
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      versions[packageManager][name])
  ) {
    return;
  }

  if (userConfig.dependencies === undefined) {
    userConfig.dependencies = {};
  }

  const dependenciesForPackageManager =
    userConfig.dependencies[packageManager] ?? {};

  dependenciesForPackageManager[name] = version;
  userConfig.dependencies[packageManager] = dependenciesForPackageManager;

  await userConfig.$commit();
};

export const updateConfigsIfVersionChanged = async ({
  global,
  maybeFluenceConfig,
  ...restArgs
}: UpdateFluenceConfigIfVersionChangedArgs & {
  global: boolean;
}): Promise<void> => {
  if (global) {
    await updateUserConfigIfVersionChanged(restArgs);
  } else {
    await updateFluenceConfigIfVersionChanged({
      maybeFluenceConfig,
      ...restArgs,
    });
  }
};

type ResolveVersionArg = {
  name: string;
  maybeVersion: string | undefined;
  packageManager: PackageManager;
  maybeFluenceConfig: FluenceConfig | null;
};

export const resolveVersionToInstall = ({
  name,
  maybeVersion,
  packageManager,
  maybeFluenceConfig,
}: ResolveVersionArg):
  | {
      versionToInstall: string;
    }
  | {
      maybeVersionToCheck: string | undefined;
    } => {
  if (typeof maybeVersion === "string") {
    if (!isExactVersion(maybeVersion)) {
      return {
        maybeVersionToCheck: maybeVersion,
      };
    }

    return {
      versionToInstall: maybeVersion,
    };
  }

  const maybeRecommendedVersion = (() => {
    if (packageManager === "cargo" && isFluenceCargoDependency(name)) {
      return versions.cargo[name];
    } else if (packageManager === "npm" && isFluenceNPMDependency(name)) {
      return versions.npm[name];
    } else {
      return undefined;
    }
  })();

  const maybeKnownVersion =
    maybeFluenceConfig?.dependencies?.[packageManager]?.[name] ??
    userConfig.dependencies?.[packageManager]?.[name] ??
    maybeRecommendedVersion;

  if (typeof maybeKnownVersion === "string") {
    return {
      versionToInstall: maybeKnownVersion,
    };
  }

  return { maybeVersionToCheck: undefined };
};

const dependenciesPathsGettersMap: Record<
  PackageManager,
  () => [Promise<string>, Promise<string>]
> = {
  npm: () => {
    return [ensureUserFluenceNpmDir(), ensureUserFluenceTmpNpmDir()];
  },
  cargo: () => {
    return [ensureUserFluenceCargoDir(), ensureUserFluenceTmpCargoDir()];
  },
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
    await rm(dependencyTmpPath, { recursive: true, force: true });
    await installDependency();
    await rm(dependencyPath, { recursive: true, force: true });
    await mkdir(dependencyPath, { recursive: true });
    await rename(dependencyTmpPath, dependencyPath);
  };

  if (force) {
    await installAndMoveToDependencyPath();
  } else {
    try {
      // if dependency is already installed it will be there
      // so there is no need to install
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

export const resolveDependencies = async (
  packageManager: PackageManager,
  maybeFluenceConfig: FluenceConfigReadonly | null
) => {
  const recommendedDependencies = (() => {
    if (packageManager === "cargo") {
      return fluenceCargoDependencies.reduce(
        (acc, dep) => {
          return { ...acc, [dep]: versions.cargo[dep] };
        },
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        {} as Record<(typeof fluenceCargoDependencies)[number], string>
      );
    }

    return fluenceNPMDependencies.reduce(
      (acc, dep) => {
        return { ...acc, [dep]: versions.npm[dep] };
      },
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      {} as Record<(typeof fluenceNPMDependencies)[number], string>
    );
  })();

  const userFluenceConfig = await initReadonlyUserConfig();

  const userDependencyOverrides =
    userFluenceConfig?.dependencies?.[packageManager] ?? {};

  const projectDependencyOverrides =
    maybeFluenceConfig?.dependencies?.[packageManager] ?? {};

  const finalDependencies: Record<string, string> = {
    ...recommendedDependencies,
    ...userDependencyOverrides,
    ...projectDependencyOverrides,
  };

  // Warn about overridden recommended dependencies
  Object.entries(recommendedDependencies).forEach(([name, defaultVersion]) => {
    const versionToUse = finalDependencies[name];

    if (versionToUse === defaultVersion || versionToUse === undefined) {
      return;
    }

    if (versionToUse === projectDependencyOverrides[name]) {
      assert(maybeFluenceConfig !== null);

      commandObj.log(
        color.yellow(
          `Using version ${versionToUse} of ${name} defined at ${maybeFluenceConfig.$getPath()} instead of the recommended version ${defaultVersion}. You can reset it to the recommended version by running \`fluence dep r\``
        )
      );

      return;
    }

    if (versionToUse === userDependencyOverrides[name]) {
      assert(userFluenceConfig !== null);

      commandObj.log(
        color.yellow(
          `Using version ${versionToUse} of ${name} defined at ${userFluenceConfig.$getPath()} instead of the recommended version ${defaultVersion}. You may want to consider adding it to your project's fluence config. You can reset it to the recommended version by running \`fluence dep r -g\``
        )
      );

      return;
    }
  });

  // Warn about using user dependencies from .fluence/config.json
  Object.entries(userDependencyOverrides).forEach(([name, version]) => {
    if (
      finalDependencies[name] === version &&
      projectDependencyOverrides[name] !== version &&
      !(name in recommendedDependencies)
    ) {
      assert(userFluenceConfig !== null);

      commandObj.log(
        color.yellow(
          `Using version ${version} of ${name} defined at ${userFluenceConfig.$getPath()}, you may want to consider adding it to your project's fluence config`
        )
      );
    }
  });

  return finalDependencies;
};
