/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
      delete maybeFluenceConfig.mreplVersion;
    }

    if (maybeFluenceConfig.marineVersion !== undefined) {
      delete maybeFluenceConfig.marineVersion;
    }

    if (maybeFluenceConfig.rustToolchain !== undefined) {
      delete maybeFluenceConfig.rustToolchain;
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
