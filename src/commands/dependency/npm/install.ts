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

import path from "node:path";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../../../baseCommand";
import {
  defaultFluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../../../lib/configs/project/fluenceLock";
import {
  FLUENCE_DIR_NAME,
  NPM_DIR_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
} from "../../../lib/const";
import {
  ensureVSCodeSettingsJSON,
  ensureAquaImports,
} from "../../../lib/helpers/aquaImports";
import { getArg } from "../../../lib/helpers/getArg";
import { initCli } from "../../../lib/lifecyle";
import { ensureNpmDependency } from "../../../lib/npm";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dependency:npm:i", "dep:npm:i"];
  static override description = `Install npm project dependencies (all dependencies are cached inside ${path.join(
    FLUENCE_DIR_NAME,
    NPM_DIR_NAME
  )} directory of the current user)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    force: Flags.boolean({
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
  };
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: getArg(
      PACKAGE_NAME_AND_VERSION_ARG_NAME,
      "Package name. Installs the latest version of the package by default. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: @fluencelabs/aqua-lib@0.6.0"
    ),
  };

  async run(): Promise<void> {
    const { args, flags, fluenceConfig, commandObj } = await initCli(
      this,
      await this.parse(Install),
      true
    );

    const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    const fluenceLockConfig =
      (await initFluenceLockConfig(this)) ??
      (await initNewFluenceLockConfig(defaultFluenceLockConfig, this));

    // if packageNameAndVersion is undefined, then we call ensureAquaImports
    // which also installs all npm dependencies from fluence config
    // and then add those imports to vscode settings.json
    if (packageNameAndVersion === undefined) {
      await ensureVSCodeSettingsJSON({
        commandObj,
        aquaImports: await ensureAquaImports({
          commandObj,
          maybeFluenceConfig: fluenceConfig,
          maybeFluenceLockConfig: fluenceLockConfig,
          force: flags.force,
        }),
      });

      return commandObj.log("npm dependencies successfully installed");
    }

    await ensureNpmDependency({
      commandObj,
      nameAndVersion: packageNameAndVersion,
      maybeFluenceConfig: fluenceConfig,
      maybeFluenceLockConfig: fluenceLockConfig,
      explicitInstallation: true,
    });
  }
}
