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

import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import type { FluenceConfig } from "../../lib/configs/project/fluence";
import {
  defaultFluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../../lib/configs/project/fluenceLock";
import {
  AQUA_NPM_DEPENDENCY,
  AQUA_RECOMMENDED_VERSION,
  CommandObj,
  FLUENCE_DIR_NAME,
  MARINE_CARGO_DEPENDENCY,
  MARINE_RECOMMENDED_VERSION,
  MREPL_CARGO_DEPENDENCY,
  MREPL_RECOMMENDED_VERSION,
} from "../../lib/const";
import {
  ensureAquaImports,
  ensureVSCodeSettingsJSON,
} from "../../lib/helpers/aquaImports";
import { initCli } from "../../lib/lifecyle";
import { getLatestVersionOfNPMDependency } from "../../lib/npm";
import {
  getLatestVersionOfCargoDependency,
  installAllCargoDependenciesFromFluenceConfig,
} from "../../lib/rust";

const REQUIRED_DEPENDENCIES = `${AQUA_NPM_DEPENDENCY}, ${MARINE_CARGO_DEPENDENCY} and ${MREPL_CARGO_DEPENDENCY}`;

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dependency:i", "dep:i"];
  static override description = `Install all project dependencies (dependencies are cached inside ${FLUENCE_DIR_NAME} directory of the current user)`;
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
    force: Flags.boolean({
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, commandObj } = await initCli(
      this,
      await this.parse(Install),
      true
    );

    const fluenceLockConfig =
      (await initFluenceLockConfig(this)) ??
      (await initNewFluenceLockConfig(defaultFluenceLockConfig, commandObj));

    if (flags.recommended) {
      await handleRecommendedFlag(fluenceConfig);
    } else if (flags.latest) {
      await handleLatestFlag(fluenceConfig, commandObj);
    }

    await ensureVSCodeSettingsJSON({
      commandObj,
      aquaImports: await ensureAquaImports({
        commandObj,
        maybeFluenceConfig: fluenceConfig,
        maybeFluenceLockConfig: fluenceLockConfig,
        force: flags.force,
      }),
    });

    await installAllCargoDependenciesFromFluenceConfig({
      commandObj,
      fluenceConfig,
      fluenceLockConfig: fluenceLockConfig,
      force: flags.force,
    });

    commandObj.log("cargo and npm dependencies successfully installed");
  }
}

const handleRecommendedFlag = (fluenceConfig: FluenceConfig): Promise<void> => {
  if (fluenceConfig?.dependencies?.npm?.[AQUA_NPM_DEPENDENCY] !== undefined) {
    fluenceConfig.dependencies.npm[AQUA_NPM_DEPENDENCY] =
      AQUA_RECOMMENDED_VERSION;
  }

  if (
    fluenceConfig?.dependencies?.cargo?.[MARINE_CARGO_DEPENDENCY] !== undefined
  ) {
    fluenceConfig.dependencies.cargo[MARINE_CARGO_DEPENDENCY] =
      MARINE_RECOMMENDED_VERSION;
  }

  if (
    fluenceConfig?.dependencies?.cargo?.[MREPL_CARGO_DEPENDENCY] !== undefined
  ) {
    fluenceConfig.dependencies.cargo[MREPL_CARGO_DEPENDENCY] =
      MREPL_RECOMMENDED_VERSION;
  }

  return fluenceConfig.$commit();
};

const handleLatestFlag = async (
  fluenceConfig: FluenceConfig,
  commandObj: CommandObj
): Promise<void> => {
  if (fluenceConfig?.dependencies?.npm?.[AQUA_NPM_DEPENDENCY] !== undefined) {
    fluenceConfig.dependencies.npm[AQUA_NPM_DEPENDENCY] =
      await getLatestVersionOfNPMDependency(AQUA_NPM_DEPENDENCY, commandObj);
  }

  if (
    fluenceConfig?.dependencies?.cargo?.[MARINE_CARGO_DEPENDENCY] !== undefined
  ) {
    fluenceConfig.dependencies.cargo[MARINE_CARGO_DEPENDENCY] =
      await getLatestVersionOfCargoDependency({
        name: MARINE_CARGO_DEPENDENCY,
        commandObj,
      });
  }

  if (
    fluenceConfig?.dependencies?.cargo?.[MREPL_CARGO_DEPENDENCY] !== undefined
  ) {
    fluenceConfig.dependencies.cargo[MREPL_CARGO_DEPENDENCY] =
      await getLatestVersionOfCargoDependency({
        name: MREPL_CARGO_DEPENDENCY,
        commandObj,
      });
  }

  return fluenceConfig.$commit();
};
