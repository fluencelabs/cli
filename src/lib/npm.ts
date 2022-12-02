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
import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";

import type { FluenceConfig } from "./configs/project/fluence";
import {
  defaultFluenceLockConfig,
  FluenceLockConfig,
  initNewReadonlyFluenceLockConfig,
} from "./configs/project/fluenceLock";
import {
  AQUA_NPM_DEPENDENCY,
  AQUA_RECOMMENDED_VERSION,
  CommandObj,
  DOT_BIN_DIR_NAME,
  NODE_MODULES_DIR_NAME,
} from "./const";
import { execPromise } from "./execPromise";
import { splitPackageNameAndVersion } from "./helpers/package";
import { replaceHomeDir } from "./helpers/replaceHomeDir";
import { ensureUserFluenceNpmDir } from "./paths";

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

type NpmDependencyArg = {
  nameAndVersion: string;
  maybeFluenceConfig: FluenceConfig | null;
  maybeFluenceLockConfig: FluenceLockConfig | null;
  commandObj: CommandObj;
  explicitInstallation?: boolean;
};

export const ensureNpmDependency = async ({
  nameAndVersion,
  commandObj,
  maybeFluenceConfig,
  maybeFluenceLockConfig,
  explicitInstallation = false,
}: NpmDependencyArg): Promise<string> => {
  const npmDirPath = await ensureUserFluenceNpmDir(commandObj);
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const resolvedVersion =
    maybeVersion ??
    (explicitInstallation
      ? undefined
      : maybeFluenceLockConfig?.npm?.[name] ??
        maybeFluenceConfig?.dependencies?.npm?.[name] ??
        fluenceNPMDependencies[name]?.recommendedVersion) ??
    (await getLatestVersionOfNPMDependency(name, commandObj));

  const version = await getLatestVersionOfNPMDependency(
    `${name}@${resolvedVersion}`,
    commandObj
  );

  const dependencyPath = path.join(npmDirPath, ...name.split("/"), version);

  try {
    await fsPromises.access(dependencyPath);
  } catch {
    try {
      await execPromise({
        command: "npm",
        args: ["i", `${name}@${version}`],
        flags: { prefix: dependencyPath },
        message: `Installing ${name}@${version} to ${replaceHomeDir(
          npmDirPath
        )}`,
        printOutput: true,
      });
    } catch (error) {
      await fsPromises.rm(dependencyPath, { recursive: true });
      return commandObj.error(
        `Not able to install ${name}@${version} to ${replaceHomeDir(
          dependencyPath
        )}. Please make sure ${color.yellow(
          name
        )} is spelled correctly or try to install a different version of the dependency using ${color.yellow(
          `fluence dependency npm install ${name}@<version>`
        )} command.\n${String(error)}`
      );
    }
  }

  if (maybeFluenceLockConfig !== undefined && maybeFluenceLockConfig !== null) {
    if (maybeFluenceLockConfig.npm === undefined) {
      maybeFluenceLockConfig.npm = {};
    }

    assert(maybeFluenceLockConfig.npm !== undefined);
    maybeFluenceLockConfig.npm[name] = version;
    await maybeFluenceLockConfig.$commit();
  } else if (maybeFluenceConfig !== undefined && maybeFluenceConfig !== null) {
    await initNewReadonlyFluenceLockConfig(
      {
        ...defaultFluenceLockConfig,
        npm: {
          [name]: version,
        },
      },
      commandObj
    );
  }

  if (explicitInstallation) {
    commandObj.log(
      `Successfully installed ${name}@${version} to ${replaceHomeDir(
        dependencyPath
      )}`
    );
  }

  const maybeNpmDependencyInfo = fluenceNPMDependencies[name];

  return maybeNpmDependencyInfo?.bin === undefined
    ? path.join(dependencyPath, NODE_MODULES_DIR_NAME)
    : path.join(
        dependencyPath,
        NODE_MODULES_DIR_NAME,
        DOT_BIN_DIR_NAME,
        maybeNpmDependencyInfo.bin
      );
};
