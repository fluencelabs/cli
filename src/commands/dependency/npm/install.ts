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

import path, { join } from "node:path";

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import { commandObj } from "../../../lib/commandObj.js";
import {
  CONFIG_FILE_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  GLOBAL_FLAG,
  GLOBAL_FLAG_NAME,
  NPM_DIR_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
} from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import {
  ensureNpmDependency,
  installAllNPMDependencies,
} from "../../../lib/npm.js";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dependency:npm:i", "dep:npm:i"];
  static override description = `(For advanced users) Install npm project dependencies (all dependencies are cached inside user's ${path.join(
    DOT_FLUENCE_DIR_NAME,
    NPM_DIR_NAME
  )} directory)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    force: Flags.boolean({
      default: false,
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
    ...GLOBAL_FLAG,
  };
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: Args.string({
      description: `Package name. Installs a first version it can find in the following list: ${FLUENCE_CONFIG_FILE_NAME}, , user's ${join(
        DOT_FLUENCE_DIR_NAME,
        CONFIG_FILE_NAME
      )}, dependency versions recommended by fluence, latest version cargo is aware of. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: @fluencelabs/aqua-lib@0.6.0`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Install)
    );

    const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    // if packageNameAndVersion not provided just install all npm dependencies
    if (packageNameAndVersion === undefined) {
      await installAllNPMDependencies({
        maybeFluenceConfig,
        force: flags.force,
      });

      return commandObj.log("npm dependencies successfully installed");
    }

    if (!flags.global && maybeFluenceConfig === null) {
      return commandObj.error(
        `Not a fluence project. If you wanted to install npm dependencies globally for the current user, use --${GLOBAL_FLAG_NAME} flag`
      );
    }

    await ensureNpmDependency({
      nameAndVersion: packageNameAndVersion,
      maybeFluenceConfig,
      explicitInstallation: true,
      force: flags.force,
      global: flags.global,
    });
  }
}
