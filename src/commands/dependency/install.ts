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

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";

import {
  defaultFluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../../lib/configs/project/fluenceLock";
import {
  AQUA_NPM_DEPENDENCY,
  AQUA_RECOMMENDED_VERSION,
  FLUENCE_DIR_NAME,
  MARINE_CARGO_DEPENDENCY,
  MARINE_RECOMMENDED_VERSION,
  MREPL_CARGO_DEPENDENCY,
  MREPL_RECOMMENDED_VERSION,
  NO_INPUT_FLAG,
} from "../../lib/const";
import {
  ensureAquaImports,
  ensureVSCodeSettingsJSON,
} from "../../lib/helpers/aquaImports";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { getLatestVersionOfNPMDependency } from "../../lib/npm";
import { getLatestVersionOfCargoDependency } from "../../lib/rust";

import { installAllCargoDependenciesFromFluenceConfig } from "./cargo/install";

const REQUIRED_DEPENDENCIES = `${AQUA_NPM_DEPENDENCY}, ${MARINE_CARGO_DEPENDENCY} and ${MREPL_CARGO_DEPENDENCY}`;

export default class Install extends Command {
  static override aliases = ["dependency:i", "dep:i"];
  static override description = `Install all project dependencies (dependencies are cached inside ${color.yellow(
    FLUENCE_DIR_NAME
  )} directory of the current user)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    recommended: Flags.boolean({
      description: `Set latest versions of ${REQUIRED_DEPENDENCIES} dependencies and install all dependencies from fluence.yaml`,
      exclusive: ["latest"],
    }),
    latest: Flags.boolean({
      description: `Set recommended versions of ${REQUIRED_DEPENDENCIES} dependencies and install all dependencies from fluence.yaml`,
      exclusive: ["recommended"],
    }),
    ...NO_INPUT_FLAG,
  };
  async run(): Promise<void> {
    const { flags } = await this.parse(Install);
    const isInteractive = getIsInteractive(flags);
    const fluenceConfig = await ensureFluenceProject(this, isInteractive);

    const fluenceLockConfig =
      (await initFluenceLockConfig(this)) ??
      (await initNewFluenceLockConfig(defaultFluenceLockConfig, this));

    if (flags.recommended) {
      fluenceConfig.dependencies.npm[AQUA_NPM_DEPENDENCY] =
        AQUA_RECOMMENDED_VERSION;

      fluenceConfig.dependencies.cargo[MARINE_CARGO_DEPENDENCY] =
        MARINE_RECOMMENDED_VERSION;

      fluenceConfig.dependencies.cargo[MREPL_CARGO_DEPENDENCY] =
        MREPL_RECOMMENDED_VERSION;

      await fluenceConfig.$commit();
    }

    if (flags.latest) {
      fluenceConfig.dependencies.npm[AQUA_NPM_DEPENDENCY] =
        await getLatestVersionOfNPMDependency(AQUA_NPM_DEPENDENCY, this);

      fluenceConfig.dependencies.cargo[MARINE_CARGO_DEPENDENCY] =
        await getLatestVersionOfCargoDependency({
          name: MARINE_CARGO_DEPENDENCY,
          commandObj: this,
        });

      fluenceConfig.dependencies.cargo[MREPL_CARGO_DEPENDENCY] =
        await getLatestVersionOfCargoDependency({
          name: MREPL_CARGO_DEPENDENCY,
          commandObj: this,
        });

      await fluenceConfig.$commit();
    }

    await ensureVSCodeSettingsJSON({
      commandObj: this,
      aquaImports: await ensureAquaImports({
        commandObj: this,
        maybeFluenceConfig: fluenceConfig,
        maybeFluenceLockConfig: fluenceLockConfig,
      }),
    });

    await installAllCargoDependenciesFromFluenceConfig({
      commandObj: this,
      fluenceConfig,
      fluenceLockConfig: fluenceLockConfig,
    });
  }
}
