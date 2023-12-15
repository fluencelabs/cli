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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { CLI_NAME_FULL } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { versions } from "../../versions.js";

export default class Reset extends BaseCommand<typeof Reset> {
  static override aliases = ["dep:r"];
  static override description = `Reset all project dependencies to recommended versions for the current ${CLI_NAME_FULL} version`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    const { maybeFluenceConfig } = await initCli(this, await this.parse(Reset));

    if (maybeFluenceConfig === null) {
      commandObj.error("Not a fluence project");
    }

    maybeFluenceConfig.dependencies = {
      npm: {
        ...maybeFluenceConfig.dependencies?.npm,
        ...versions.npm,
      },
    };

    await maybeFluenceConfig.$commit();
    commandObj.log("successfully reset project's dependency versions");
  }
}
