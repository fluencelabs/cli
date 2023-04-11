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

import path from "node:path";

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import {
  FLUENCE_DIR_NAME,
  NPM_DIR_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
} from "../../../lib/const.js";
import {
  ensureVSCodeSettingsJSON,
  ensureAquaImports,
} from "../../../lib/helpers/aquaImports.js";
import { initCli } from "../../../lib/lifeCycle.js";
import { ensureNpmDependency } from "../../../lib/npm.js";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dependency:npm:i", "dep:npm:i"];
  static override description = `(For advanced users) Install npm project dependencies (all dependencies are cached inside ${path.join(
    FLUENCE_DIR_NAME,
    NPM_DIR_NAME
  )} directory of the current user)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    force: Flags.boolean({
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
  };
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: Args.string({
      description: `Package name. Installs the latest version of the package by default. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: @fluencelabs/aqua-lib@0.6.0`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags, fluenceConfig } = await initCli(
      this,
      await this.parse(Install),
      true
    );

    const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    if (packageNameAndVersion !== undefined) {
      await ensureNpmDependency({
        nameAndVersion: packageNameAndVersion,
        maybeFluenceConfig: fluenceConfig,
        explicitInstallation: true,
      });
    }

    await ensureVSCodeSettingsJSON({
      aquaImports: await ensureAquaImports({
        maybeFluenceConfig: fluenceConfig,
        force: flags.force,
      }),
    });
  }
}
