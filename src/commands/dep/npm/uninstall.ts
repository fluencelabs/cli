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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import { PACKAGE_NAME_AND_VERSION_ARG_NAME } from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import { npmUninstall } from "../../../lib/npm.js";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dep:npm:un"];
  static override description = `Uninstall project aqua dependency (currently npm is used under the hood to installing aqua dependencies)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: Args.string({
      description: `valid package spec for npm install command`,
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
      packageNameAndVersion: args[PACKAGE_NAME_AND_VERSION_ARG_NAME],
      fluenceConfig,
    });
  }
}
