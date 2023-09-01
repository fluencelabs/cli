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

import { Flags, Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create new marine module template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    path: Flags.string({
      description: "Path to module dir (default: src/modules)",
      helpValue: "<path>",
    }),
    service: Flags.string({
      description:
        "Name or relative path to the service to add the created module to",
      helpValue: "<name | relative_path>",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Module name",
    }),
  };
  async run(): Promise<void> {
    const { newImpl } = await import("../../commands-impl/module/new.js");
    await newImpl.bind(this)(New);
  }
}
