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

import { join } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { NODE_MODULES_DIR_NAME } from "./const.js";
import { addCountlyLog } from "./countly.js";
import { execPromise } from "./execPromise.js";
import { stringifyUnknown } from "./helpers/jsonStringify.js";
import {
  splitPackageNameAndVersion,
  resolveDependencyDirPathAndTmpPath,
  resolveVersionToInstall,
  handleInstallation,
  resolveDependencies,
  updateConfigsIfVersionChanged,
} from "./helpers/package.js";
import { replaceHomeDir } from "./helpers/replaceHomeDir.js";

export const getLatestVersionOfNPMDependency = async (
  name: string,
): Promise<string> => {
  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return (
      await execPromise({ command: "npm", args: ["view", name, "version"] })
    )
      .trim()
      .split("\n")
      .pop() as string;
  } catch (error) {
    commandObj.error(
      `Failed to get latest version of ${color.yellow(
        name,
      )} from npm registry. Please make sure ${color.yellow(
        name,
      )} is spelled correctly\n${stringifyUnknown(error)}`,
    );
  }
};

type InstallNpmDependencyArg = {
  name: string;
  version: string;
  dependencyTmpDirPath: string;
  dependencyDirPath: string;
};

const installNpmDependency = async ({
  dependencyDirPath,
  dependencyTmpDirPath,
  name,
  version,
}: InstallNpmDependencyArg): Promise<void> => {
  try {
    await execPromise({
      command: "npm",
      args: ["i", `${name}@${version}`],
      flags: { prefix: dependencyTmpDirPath },
      spinnerMessage: `Installing ${name}@${version} to ${replaceHomeDir(
        dependencyDirPath,
      )}`,
    });
  } catch (error) {
    commandObj.error(
      `Not able to install ${name}@${version} to ${replaceHomeDir(
        dependencyDirPath,
      )}. Please make sure ${color.yellow(
        name,
      )} is spelled correctly or try to install a different version of the dependency using ${color.yellow(
        `fluence dependency npm install ${name}@<version>`,
      )} command.\n${stringifyUnknown(error)}`,
    );
  }
};

type EnsureNpmDependencyArg = {
  nameAndVersion: string;
  maybeFluenceConfig: FluenceConfig | null;
  global?: boolean;
  force?: boolean | undefined;
  explicitInstallation?: boolean;
};

export const ensureNpmDependency = async ({
  nameAndVersion,
  maybeFluenceConfig,
  global = true,
  force = false,
  explicitInstallation = false,
}: EnsureNpmDependencyArg): Promise<string> => {
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const resolveVersionToInstallResult = resolveVersionToInstall({
    name,
    maybeVersion,
    packageManager: "npm",
    maybeFluenceConfig,
  });

  const version =
    "versionToInstall" in resolveVersionToInstallResult
      ? resolveVersionToInstallResult.versionToInstall
      : await getLatestVersionOfNPMDependency(
          resolveVersionToInstallResult.maybeVersionToCheck === undefined
            ? name
            : `${name}@${resolveVersionToInstallResult.maybeVersionToCheck}`,
        );

  const { dependencyDirPath, dependencyTmpDirPath } =
    await resolveDependencyDirPathAndTmpPath({
      name,
      packageManager: "npm",
      version,
    });

  await handleInstallation({
    force,
    dependencyDirPath,
    dependencyTmpDirPath,
    explicitInstallation,
    name,
    version,
    installDependency: () => {
      return installNpmDependency({
        dependencyDirPath,
        dependencyTmpDirPath,
        name,
        version,
      });
    },
  });

  await updateConfigsIfVersionChanged({
    maybeFluenceConfig,
    name,
    version,
    global,
    packageManager: "npm",
  });

  addCountlyLog(`Using ${name}@${version} npm dependency`);

  return join(dependencyDirPath, NODE_MODULES_DIR_NAME);
};

type InstallAllNPMDependenciesArg = {
  maybeFluenceConfig: FluenceConfig | null;
  force?: boolean | undefined;
};

export const installAllNPMDependencies = async ({
  maybeFluenceConfig,
  force,
}: InstallAllNPMDependenciesArg): Promise<string[]> => {
  const dependenciesToEnsure = Object.entries(
    await resolveDependencies("npm", maybeFluenceConfig),
  );

  return Promise.all(
    dependenciesToEnsure.map(([name, version]) => {
      return ensureNpmDependency({
        nameAndVersion: `${name}@${version}`,
        maybeFluenceConfig,
        force,
      });
    }),
  );
};
