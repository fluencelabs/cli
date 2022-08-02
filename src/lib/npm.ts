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

import { getVersionToUse } from "./configs/user/dependency";
import {
  AQUA_NPM_DEPENDENCY,
  AQUA_RECOMMENDED_VERSION,
  BIN_DIR_NAME,
  CommandObj,
  NPMDependency,
} from "./const";
import { execPromise } from "./execPromise";
import { replaceHomeDir } from "./helpers/replaceHomeDir";
import { ensureUserFluenceNpmDir } from "./paths";

type NPMInstallArg = {
  packageName: string;
  version: string;
  message: string;
  commandObj: CommandObj;
};

const npmInstall = async ({
  packageName,
  version,
  message,
  commandObj,
}: NPMInstallArg): Promise<string> =>
  execPromise(
    `npm i ${packageName}@${version} -g --prefix ${await ensureUserFluenceNpmDir(
      commandObj
    )}`,
    message
  );

export const npmDependencies: Record<
  NPMDependency,
  { recommendedVersion: string; bin: string; packageName: string }
> = {
  [AQUA_NPM_DEPENDENCY]: {
    recommendedVersion: AQUA_RECOMMENDED_VERSION,
    bin: "aqua",
    packageName: "@fluencelabs/aqua",
  },
};

type NpmDependencyArg = {
  name: NPMDependency;
  commandObj: CommandObj;
};

export const ensureNpmDependency = async ({
  name,
  commandObj,
}: NpmDependencyArg): Promise<string> => {
  const { bin, packageName, recommendedVersion } = npmDependencies[name];
  const npmDirPath = await ensureUserFluenceNpmDir(commandObj);
  const dependencyPath = commandObj.config.windows
    ? path.join(npmDirPath, bin)
    : path.join(npmDirPath, BIN_DIR_NAME, bin);
  const version = await getVersionToUse(recommendedVersion, name, commandObj);

  try {
    await fsPromises.access(dependencyPath);
    const result = await getNpmDependencyVersion(dependencyPath);
    if (!result.includes(version)) {
      throw new Error("Outdated");
    }
  } catch {
    await npmInstall({
      packageName,
      version,
      message: `Installing version ${color.yellow(
        version
      )} of ${packageName} to ${replaceHomeDir(npmDirPath)}`,
      commandObj,
    });
    const result = await getNpmDependencyVersion(dependencyPath);
    if (!result.includes(version)) {
      return commandObj.error(
        `Not able to install version ${color.yellow(
          version
        )} of ${packageName} to ${replaceHomeDir(npmDirPath)}`
      );
    }
  }

  return dependencyPath;
};

const getNpmDependencyVersion = (dependencyPath: string): Promise<string> =>
  execPromise(`${dependencyPath} --version`);
