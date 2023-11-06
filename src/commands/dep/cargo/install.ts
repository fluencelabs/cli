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

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import { commandObj } from "../../../lib/commandObj.js";
import {
  CARGO_DIR_NAME,
  GLOBAL_CONFIG_FULL_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  GLOBAL_FLAG,
  GLOBAL_FLAG_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
} from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import {
  ensureCargoDependency,
  installAllCargoDependencies,
} from "../../../lib/rust.js";
import versions from "../../../versions.json" assert { type: "json" };

const FORCE_FLAG_NAME = "force";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dep:cargo:i"];
  static override description = `(For advanced users) Install cargo project dependencies (all dependencies are cached inside user's ${join(
    DOT_FLUENCE_DIR_NAME,
    CARGO_DIR_NAME,
  )} directory)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    toolchain: Flags.string({
      description: `Rust toolchain name that will be used in case pre-built binary download fails or --${FORCE_FLAG_NAME} flag is used. Default: ${versions["rust-toolchain"]}"]}`,
      helpValue: "<toolchain_name>",
    }),
    [FORCE_FLAG_NAME]: Flags.boolean({
      default: false,
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
    ...GLOBAL_FLAG,
  };
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: Args.string({
      description: `Package name. Installs a first version it can find in the following list: ${FLUENCE_CONFIG_FULL_FILE_NAME}, user's ${join(
        DOT_FLUENCE_DIR_NAME,
        GLOBAL_CONFIG_FULL_FILE_NAME,
      )}, dependency versions recommended by fluence, latest version cargo is aware of. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: package@version`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Install),
    );

    const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    // if packageNameAndVersion not provided just install all cargo dependencies
    if (packageNameAndVersion === undefined) {
      await installAllCargoDependencies({
        maybeFluenceConfig,
        force: flags.force,
      });

      commandObj.log("cargo dependencies successfully installed");
      return;
    }

    if (!flags.global && maybeFluenceConfig === null) {
      return commandObj.error(
        `Not a fluence project. If you wanted to install cargo dependencies globally for the current user, use --${GLOBAL_FLAG_NAME} flag`,
      );
    }

    await ensureCargoDependency({
      nameAndVersion: packageNameAndVersion,
      maybeFluenceConfig,
      explicitInstallation: true,
      force: flags.force,
      toolchain: flags.toolchain,
      global: flags.global,
    });
  }
}
