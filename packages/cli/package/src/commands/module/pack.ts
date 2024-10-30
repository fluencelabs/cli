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

import { cwd } from "node:process";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module.js";
import {
  MARINE_BUILD_ARGS_FLAG,
  MARINE_BUILD_ARGS_FLAG_NAME,
  MODULE_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { packModule } from "../../lib/helpers/packModule.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { input } from "../../lib/prompt.js";

const PATH = "PATH";

export default class Pack extends BaseCommand<typeof Pack> {
  static override description = `Pack module into tar.gz archive`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...MARINE_BUILD_ARGS_FLAG,
    destination: Flags.string({
      description:
        "Path to a directory where you want archive to be saved. Default: current directory",
      char: "d",
    }),
    "binding-crate": Flags.string({
      description: "Path to a directory with rust binding crate",
      char: "b",
    }),
  };
  static override args = {
    [PATH]: Args.string({
      description: "Path to a module",
    }),
  };
  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Pack));

    const modulePath =
      args[PATH] ??
      (await input({
        message: "Enter path to a module",
      }));

    const moduleConfig = await initReadonlyModuleConfig(modulePath, cwd());

    if (moduleConfig === null) {
      return commandObj.error(
        `${color.yellow(
          MODULE_CONFIG_FULL_FILE_NAME,
        )} not found for ${modulePath}`,
      );
    }

    const marineCli = await initMarineCli();

    await packModule({
      moduleConfig,
      marineCli,
      marineBuildArgs: flags[MARINE_BUILD_ARGS_FLAG_NAME],
      bindingCrate: flags["binding-crate"],
      destination:
        flags.destination ??
        (await input({
          message:
            "Enter path to a directory where you want archive to be saved. Default: current directory",
          default: cwd(),
        })),
    });
  }
}
