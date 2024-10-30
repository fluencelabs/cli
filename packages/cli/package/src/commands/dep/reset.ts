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

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject.js";
import { initCli } from "../../lib/lifeCycle.js";
import { npmInstallAll } from "../../lib/npm.js";
import { versions } from "../../versions.js";

export default class Reset extends BaseCommand<typeof Reset> {
  static override aliases = ["dep:r"];
  static override description =
    "Reset all project dependencies to recommended versions";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  async run(): Promise<void> {
    await initCli(this, await this.parse(Reset));
    const fluenceConfig = await ensureFluenceProject();

    if (fluenceConfig.mreplVersion !== undefined) {
      delete fluenceConfig.mreplVersion;
    }

    if (fluenceConfig.marineVersion !== undefined) {
      delete fluenceConfig.marineVersion;
    }

    if (fluenceConfig.rustToolchain !== undefined) {
      delete fluenceConfig.rustToolchain;
    }

    await fluenceConfig.$commit();

    fluenceConfig.aquaDependencies = {
      ...fluenceConfig.aquaDependencies,
      ...versions.npm,
    };

    await npmInstallAll();
    await fluenceConfig.$commit();
    commandObj.log("Successfully reset project dependencies versions");
  }
}
