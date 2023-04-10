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

import { rm } from "node:fs/promises";
import { join } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import versions from "../versions.json" assert { type: "json" };

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  NODE_MODULES_DIR_NAME,
  fluenceNPMDependencies,
  isFluenceNPMDependency,
} from "./const.js";
import { addCountlyLog } from "./countly.js";
import { execPromise } from "./execPromise.js";
import {
  splitPackageNameAndVersion,
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
        name
      )} from npm registry. Please make sure ${color.yellow(
        name
      )} is spelled correctly\n${String(error)}`
    );
  }
};

export const getNPMVersionsMap = <T extends keyof typeof versions.npm>(
  dependencies: ReadonlyArray<T>
) =>
  dependencies.reduce<Record<T, string>>(
    (acc, dep) => ({ ...acc, [dep]: versions.npm[dep] }),
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    {} as Record<T, string>
  );

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
    await execPromise({
      command: "npm",
      args: ["i", `${name}@${version}`],
      flags: { prefix: dependencyTmpPath },
      spinnerMessage: `Installing ${name}@${version} to ${replaceHomeDir(
        dependencyPath
      )}`,
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
  force?: boolean | undefined;
  explicitInstallation?: boolean;
};

export const ensureNpmDependency = async ({
  nameAndVersion,
  maybeFluenceConfig,
  force = false,
  explicitInstallation = false,
}: EnsureNpmDependencyArg): Promise<string> => {
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const resolveVersionToInstallResult = resolveVersionToInstall({
    name,
    maybeVersion,
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

  if (
    maybeFluenceConfig !== null &&
    version !==
      (maybeFluenceConfig?.dependencies?.npm?.[name] ??
        (isFluenceNPMDependency(name) ? versions.npm[name] : undefined))
  ) {
    await handleFluenceConfig({
      fluenceConfig: maybeFluenceConfig,
      name,
      packageManager: "npm",
      version,
    });
  }

  addCountlyLog(`Using ${name}@${version} npm dependency`);

  return join(dependencyPath, NODE_MODULES_DIR_NAME);
};

type InstallAllNPMDependenciesArg = {
  maybeFluenceConfig: FluenceConfig | null;
  force?: boolean | undefined;
};

export const installAllNPMDependencies = ({
  maybeFluenceConfig,
  force,
}: InstallAllNPMDependenciesArg): Promise<string[]> => {
  const dependenciesToEnsure = Object.entries({
    ...getNPMVersionsMap(fluenceNPMDependencies),
    ...(maybeFluenceConfig?.dependencies?.npm ?? {}),
  });

  return Promise.all(
    dependenciesToEnsure.map(([name, version]) =>
      ensureNpmDependency({
        nameAndVersion: `${name}@${version}`,
        maybeFluenceConfig,
        force,
      })
    )
  );
};
