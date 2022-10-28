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
import path from "node:path";

import color from "@oclif/color";
import { Command } from "@oclif/core";

import type { FluenceConfig } from "../../../lib/configs/project/fluence";
import {
  CommandObj,
  FLUENCE_DIR_NAME,
  NO_INPUT_FLAG,
  NPM_DIR_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
} from "../../../lib/const";
import {
  ensureVSCodeSettingsJSON,
  ensureAquaImports,
} from "../../../lib/helpers/aquaImports";
import { ensureFluenceProject } from "../../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../../lib/helpers/getIsInteractive";
import { ensureNpmDependency } from "../../../lib/npm";

export default class Install extends Command {
  static override aliases = ["dependency:npm:i", "dep:npm:i"];
  static override description = `Install npm project dependencies (all dependencies are cached inside ${path.join(
    FLUENCE_DIR_NAME,
    NPM_DIR_NAME
  )} directory of the current user)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: PACKAGE_NAME_AND_VERSION_ARG_NAME,
      description: `Package name. Installs the latest version of the package by default. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: ${color.yellow(
        "@fluencelabs/aqua@0.7.5-342"
      )}`,
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Install);
    const isInteractive = getIsInteractive(flags);
    const fluenceConfig = await ensureFluenceProject(this, isInteractive);

    const packageNameAndVersion: unknown =
      args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    // packageNameAndVersion is always a string or undefined,
    // while oclif framework says it's 'any'
    assert(
      packageNameAndVersion === undefined ||
        typeof packageNameAndVersion === "string"
    );

    // if packageNameAndVersion is undefined, then we call ensureAquaImports
    // which also installs all npm dependencies from fluence config
    // and then add those imports to vscode settings.json
    if (packageNameAndVersion === undefined) {
      const aquaImports = await ensureAquaImports({
        commandObj: this,
        fluenceConfig,
      });

      await ensureVSCodeSettingsJSON({
        commandObj: this,
        aquaImports,
      });

      return;
    }

    await ensureNpmDependency({
      commandObj: this,
      nameAndVersion: packageNameAndVersion,
      fluenceConfig,
      explicitInstallation: true,
    });

    await ensureVSCodeSettingsJSON({
      commandObj: this,
      aquaImports: await ensureAquaImports({ commandObj: this, fluenceConfig }),
    });
  }
}

type InstallAllDependenciesArg = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfig;
};

export const installAllNPMDependenciesFromFluenceConfig = async ({
  fluenceConfig,
  commandObj,
}: InstallAllDependenciesArg): Promise<string[]> => {
  const dependencyPaths = [];

  for (const [name, version] of Object.entries(
    fluenceConfig.dependencies.npm
  )) {
    assert(name !== undefined && version !== undefined);

    dependencyPaths.push(
      // Not installing dependencies in parallel
      // for npm logs to be clearly readable
      // eslint-disable-next-line no-await-in-loop
      await ensureNpmDependency({
        nameAndVersion: `${name}@${version}`,
        commandObj,
        fluenceConfig,
      })
    );
  }

  return dependencyPaths;
};
