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

// import { dirname } from "path";
// import { fileURLToPath } from "url";

import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initFluenceLockConfig } from "../../lib/configs/project/fluenceLock.js";
import {
  AQUA_LIB_NPM_DEPENDENCY,
  AQUA_LIB_RECOMMENDED_VERSION,
  AQUA_NPM_DEPENDENCY,
  AQUA_RECOMMENDED_VERSION,
  MARINE_CARGO_DEPENDENCY,
  MARINE_RECOMMENDED_VERSION,
  MREPL_CARGO_DEPENDENCY,
  MREPL_RECOMMENDED_VERSION,
} from "../../lib/const.js";
// import { execPromise } from "../../lib/execPromise.js";
import { initCli } from "../../lib/lifecyle.js";

const NPM_OVERRIDABLE_DEP =
  "npm dependencies that can be overridden with 'fluence dependency npm install <name>@<version>'";

const CARGO_OVERRIDABLE_DEP =
  "cargo dependencies that can be overridden with 'fluence dependency cargo install <name>@<version>'";

export default class Versions extends BaseCommand<typeof Versions> {
  static override aliases = ["dependency:v", "dep:v"];
  static override description =
    "Get versions of all currently used dependencies";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    const { maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Versions)
    );

    // TODO: DXJ-284 show all package dependencies

    // const versions = await execPromise({
    //   command: "npm list",
    //   options: {
    //     cwd: dirname(fileURLToPath(import.meta.url)),
    //     shell: true,
    //   },
    // });

    // const versionsObj = versions
    //   .split("── ")
    //   .slice(1)
    //   .reduce(
    //     (acc, val) => {
    //       const nameAndVersion = val.split("@");
    //       const version = nameAndVersion.pop();
    //       assert(version !== undefined);
    //       const packageName = nameAndVersion.join("@");
    //       return { ...acc, [packageName]: version.slice(0, -2) };
    //     },
    //     { "@fluencelabs/cli": commandObj.config.version }
    //   );

    const recommendedDependencies = {
      [NPM_OVERRIDABLE_DEP]: {
        [AQUA_NPM_DEPENDENCY]: AQUA_RECOMMENDED_VERSION,
        [AQUA_LIB_NPM_DEPENDENCY]: AQUA_LIB_RECOMMENDED_VERSION,
      },
      [CARGO_OVERRIDABLE_DEP]: {
        [MARINE_CARGO_DEPENDENCY]: MARINE_RECOMMENDED_VERSION,
        [MREPL_CARGO_DEPENDENCY]: MREPL_RECOMMENDED_VERSION,
      },
    };

    if (maybeFluenceConfig === null) {
      return commandObj.log(
        yamlDiffPatch(
          "",
          {},
          { /*...versionsObj,*/ ...recommendedDependencies }
        )
      );
    }

    const fluenceConfig = maybeFluenceConfig;

    const fluenceLockConfig = await initFluenceLockConfig();

    commandObj.log(
      yamlDiffPatch(
        "",
        {},
        {
          /*...versionsObj,*/
          [NPM_OVERRIDABLE_DEP]: {
            ...recommendedDependencies[NPM_OVERRIDABLE_DEP],
            ...fluenceConfig?.dependencies?.npm,
            ...fluenceLockConfig?.npm,
          },
          [CARGO_OVERRIDABLE_DEP]: {
            ...recommendedDependencies[CARGO_OVERRIDABLE_DEP],
            ...fluenceConfig?.dependencies?.cargo,
            ...fluenceLockConfig?.cargo,
          },
        }
      )
    );
  }
}
