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
  CARGO_DIR_NAME,
  FLUENCE_DIR_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
  REQUIRED_RUST_TOOLCHAIN,
} from "../../../lib/const";
import { getArg } from "../../../lib/helpers/getArg";
import { initCli } from "../../../lib/lifecyle";
import {
  ensureCargoDependency,
  installAllCargoDependenciesFromFluenceConfig,
} from "../../../lib/rust";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dependency:cargo:i", "dep:cargo:i"];
  static override description = `Install cargo project dependencies (all dependencies are cached inside ${path.join(
    FLUENCE_DIR_NAME,
    CARGO_DIR_NAME
  )} directory of the current user)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    toolchain: Flags.string({
      description: `Rustup toolchain name (such as stable or ${REQUIRED_RUST_TOOLCHAIN})`,
      helpValue: "<toolchain_name>",
    }),
    force: Flags.boolean({
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
  };
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: getArg(
      PACKAGE_NAME_AND_VERSION_ARG_NAME,
      "Package name. Installs the latest version of the package by default. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: marine@0.12.4"
    ),
  };

  async run(): Promise<void> {
    const { args, flags, commandObj, fluenceConfig } = await initCli(
      this,
      await this.parse(Install),
      true
    );

    const fluenceLockConfig =
      (await initFluenceLockConfig(this)) ??
      (await initNewFluenceLockConfig(defaultFluenceLockConfig, this));

    const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    // if packageNameAndVersion not provided just install all cargo dependencies
    if (packageNameAndVersion === undefined) {
      await installAllCargoDependenciesFromFluenceConfig({
        fluenceConfig,
        commandObj,
        fluenceLockConfig,
        force: flags.force,
      });

      return commandObj.log("cargo dependencies successfully installed");
    }

    await ensureCargoDependency({
      commandObj,
      nameAndVersion: packageNameAndVersion,
      maybeFluenceConfig: fluenceConfig,
      explicitInstallation: true,
      maybeFluenceLockConfig: fluenceLockConfig,
      force: flags.force,
    });
  }
}
