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
