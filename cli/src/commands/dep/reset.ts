/**
 * Copyright 2024 Fluence DAO
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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { CLI_NAME } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { npmInstallAll } from "../../lib/npm.js";
import { versions } from "../../versions.js";

export default class Reset extends BaseCommand<typeof Reset> {
  static override aliases = ["dep:r"];
  static override description =
    "Reset all project dependencies to recommended versions";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    const { maybeFluenceConfig } = await initCli(this, await this.parse(Reset));

    if (maybeFluenceConfig === null) {
      commandObj.error(
        `Not a fluence project. Default dependency versions are always used if running cli outside of the fluence project. Run '${CLI_NAME} dep v' to check them out`,
      );
    }

    if (maybeFluenceConfig.mreplVersion !== undefined) {
      maybeFluenceConfig.mreplVersion = versions.cargo.mrepl;
    }

    if (maybeFluenceConfig.marineVersion !== undefined) {
      maybeFluenceConfig.marineVersion = versions.cargo.marine;
    }

    await maybeFluenceConfig.$commit();

    maybeFluenceConfig.aquaDependencies = {
      ...maybeFluenceConfig.aquaDependencies,
      ...versions.npm,
    };

    await npmInstallAll(maybeFluenceConfig);
    await maybeFluenceConfig.$commit();
    commandObj.log("Successfully reset project dependencies versions");
  }
}
