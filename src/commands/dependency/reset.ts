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
import { CLI_NAME_FULL, GLOBAL_FLAG } from "../../lib/const.js";

export default class Reset extends BaseCommand<typeof Reset> {
  static override aliases = ["dependency:r", "dep:r"];
  static override description = `Reset all project dependencies to recommended versions for the current ${CLI_NAME_FULL} version`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...GLOBAL_FLAG,
    all: Flags.boolean({
      default: false,
      description: "Remove all dependencies, not only recommended ones",
    }),
  };
  async run(): Promise<void> {
    const { resetImpl } = await import(
      "../../commands-impl/dependency/reset.js"
    );

    await resetImpl.bind(this)(Reset);
  }
}
