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

import {
  AQUA_NPM_DEPENDENCY,
  initReadonlyDependencyConfig,
  NPMDependency,
} from "./configs/user/dependency";
import { AQUA_RECOMMENDED_VERSION, CommandObj } from "./const";
import { execPromise } from "./execPromise";
import { replaceHomeDir } from "./helpers/replaceHomeDir";
import { ensureUserFluenceDir } from "./paths";

type NPMInstallOptions = {
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
}: NPMInstallOptions): Promise<string> =>
  execPromise(
    `npm i ${packageName}@${version} -g --prefix ${await ensureNpmDir(
      commandObj
    )}`,
    message
  );

export const ensureNpmDir = async (commandObj: CommandObj): Promise<string> => {
  const userFluenceDir = await ensureUserFluenceDir(commandObj);
  const npmPath = path.join(userFluenceDir, "npm");
  await fsPromises.mkdir(npmPath, { recursive: true });
  return npmPath;
};

const getVersionToUse = async (
  recommendedVersion: string,
  name: NPMDependency,
  commandObj: CommandObj
): Promise<string> => {
  const version = (await initReadonlyDependencyConfig(commandObj)).dependency[
    name
  ];
  return typeof version === "string" ? version : recommendedVersion;
};

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

type NpmDependencyOptions = {
  name: NPMDependency;
  commandObj: CommandObj;
};

export const ensureNpmDependency = async ({
  name,
  commandObj,
}: NpmDependencyOptions): Promise<string> => {
  const { bin, packageName, recommendedVersion } = npmDependencies[name];
  const npmDirPath = await ensureNpmDir(commandObj);
  const dependencyPath = path.join(npmDirPath, "bin", bin);
  const version = await getVersionToUse(recommendedVersion, name, commandObj);

  try {
    await fsPromises.access(dependencyPath);
    const result = await execPromise(`${dependencyPath} --version`);
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
  }

  return dependencyPath;
};
