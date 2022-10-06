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

import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";
import { CliUx } from "@oclif/core";

import type { FluenceConfig } from "./configs/project/fluence";
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
import { unparseFlags } from "./helpers/unparseFlags";
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
    return (await execPromise(`npm show ${name} version`)).trim();
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
  fluenceConfig?: FluenceConfig | null | undefined;
  commandObj: CommandObj;
  isSpinnerVisible?: boolean;
  explicitInstallation?: boolean;
};

export const ensureNpmDependency = async ({
  nameAndVersion,
  commandObj,
  fluenceConfig,
  isSpinnerVisible = true,
  explicitInstallation = false,
}: NpmDependencyArg): Promise<string> => {
  const npmDirPath = await ensureUserFluenceNpmDir(commandObj);
  const [name, maybeVersion] = splitPackageNameAndVersion(nameAndVersion);

  const version =
    maybeVersion ??
    (explicitInstallation
      ? undefined
      : fluenceConfig?.dependencies?.npm?.[name] ??
        fluenceNPMDependencies[name]?.recommendedVersion) ??
    (await getLatestVersionOfNPMDependency(name, commandObj));

  const dependencyPath = path.join(npmDirPath, ...name.split("/"), version);

  try {
    await fsPromises.access(dependencyPath);
  } catch {
    try {
      await execPromise(
        `npm i ${name}@${version} ${unparseFlags(
          {
            prefix: dependencyPath,
          },
          commandObj
        )}`,
        isSpinnerVisible
          ? `Installing ${name}@${version} to ${replaceHomeDir(npmDirPath)}`
          : undefined
      );
    } catch (error) {
      CliUx.ux.action.stop("failed");
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

  if (fluenceConfig !== undefined && fluenceConfig !== null) {
    fluenceConfig.dependencies.npm[name] = version;
    await fluenceConfig.$commit();
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
