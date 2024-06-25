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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { PACKAGE_NAME } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { npmUninstall } from "../../lib/npm.js";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dep:un"];
  static override description =
    "Uninstall aqua project dependencies (currently npm is used under the hood for managing aqua dependencies)";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    [PACKAGE_NAME]: Args.string({
      description: `Aqua dependency name`,
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, fluenceConfig } = await initCli(
      this,
      await this.parse(Install),
      true,
    );

    await npmUninstall({
      packageName: args[PACKAGE_NAME],
      fluenceConfig,
    });

    commandObj.logToStderr(`Uninstalled ${args[PACKAGE_NAME]} successfully`);
  }
}
