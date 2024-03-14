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

import { cwd } from "node:process";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
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
    ...baseFlags,
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
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Pack),
    );

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
      maybeFluenceConfig,
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
