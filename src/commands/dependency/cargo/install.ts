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
import { Command, Flags } from "@oclif/core";

import type { FluenceConfig } from "../../../lib/configs/project/fluence";
import {
  defaultFluenceLockConfig,
  FluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../../../lib/configs/project/fluenceLock";
import {
  CARGO_DIR_NAME,
  CommandObj,
  FLUENCE_DIR_NAME,
  NO_INPUT_FLAG,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
  REQUIRED_RUST_TOOLCHAIN,
} from "../../../lib/const";
import { ensureFluenceProject } from "../../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../../lib/helpers/getIsInteractive";
import { ensureCargoDependency } from "../../../lib/rust";

export default class Install extends Command {
  static override aliases = ["dependency:cargo:i", "dep:cargo:i"];
  static override description = `Install cargo project dependencies (all dependencies are cached inside ${path.join(
    FLUENCE_DIR_NAME,
    CARGO_DIR_NAME
  )} directory of the current user)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    toolchain: Flags.string({
      description: `Rustup toolchain name (such as stable or ${REQUIRED_RUST_TOOLCHAIN})`,
      helpValue: "<toolchain_name>",
    }),
  };
  static override args = [
    {
      name: PACKAGE_NAME_AND_VERSION_ARG_NAME,
      description: `Package name. Installs the latest version of the package by default. If you want to install a specific version, you can do so by appending @ and the version to the package name. For example: ${color.yellow(
        "marine@0.12.4"
      )}`,
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Install);
    const isInteractive = getIsInteractive(flags);
    const fluenceConfig = await ensureFluenceProject(this, isInteractive);

    const fluenceLockConfig =
      (await initFluenceLockConfig(this)) ??
      (await initNewFluenceLockConfig(defaultFluenceLockConfig, this));

    const packageNameAndVersion: unknown =
      args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    // packageNameAndVersion is always a string or undefined,
    // while oclif framework says it's 'any'
    assert(
      packageNameAndVersion === undefined ||
        typeof packageNameAndVersion === "string"
    );

    // if packageNameAndVersion not provided just install all cargo dependencies
    if (packageNameAndVersion === undefined) {
      await installAllCargoDependenciesFromFluenceConfig({
        fluenceConfig,
        commandObj: this,
        fluenceLockConfig,
      });

      return;
    }

    await ensureCargoDependency({
      commandObj: this,
      nameAndVersion: packageNameAndVersion,
      maybeFluenceConfig: fluenceConfig,
      explicitInstallation: true,
      maybeFluenceLockConfig: fluenceLockConfig,
    });
  }
}

type InstallAllDependenciesArg = {
  commandObj: CommandObj;
  fluenceConfig: FluenceConfig;
  fluenceLockConfig: FluenceLockConfig;
};

export const installAllCargoDependenciesFromFluenceConfig = async ({
  fluenceConfig,
  fluenceLockConfig,
  commandObj,
}: InstallAllDependenciesArg): Promise<void> => {
  for (const [name, version] of Object.entries(
    fluenceConfig.dependencies.cargo
  )) {
    assert(name !== undefined && version !== undefined);

    // Not installing dependencies in parallel
    // for cargo logs to be clearly readable
    // eslint-disable-next-line no-await-in-loop
    await ensureCargoDependency({
      nameAndVersion: `${name}@${version}`,
      commandObj,
      maybeFluenceConfig: fluenceConfig,
      maybeFluenceLockConfig: fluenceLockConfig,
    });
  }
};
