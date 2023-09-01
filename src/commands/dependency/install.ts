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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { DOT_FLUENCE_DIR_NAME } from "../../lib/const.js";

export default class Install extends BaseCommand<typeof Install> {
  static override aliases = ["dependency:i", "dep:i"];
  static override description = `Install all project dependencies (dependencies are cached inside user's ${DOT_FLUENCE_DIR_NAME} directory)`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    force: Flags.boolean({
      default: false,
      description:
        "Force install even if the dependency/dependencies is/are already installed",
    }),
  };
  async run(): Promise<void> {
    const { installImpl } = await import(
      "../../commands-impl/dependency/install.js"
    );

    await installImpl.bind(this)(Install);
  }
}
