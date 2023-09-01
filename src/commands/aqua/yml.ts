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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { USE_F64_FLAG } from "../../lib/const.js";

export default class Yaml extends BaseCommand<typeof Yaml> {
  static override aliases = ["aqua:yaml"];
  static override description =
    "Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into";
  static override flags = {
    ...baseFlags,
    ...USE_F64_FLAG,
  };
  static override args = {
    FUNC: Args.string({
      description: "Name of the exported function",
    }),
    INPUT: Args.string({
      description: "Path to yaml file",
    }),
    OUTPUT: Args.string({
      description: "Path to for output file",
    }),
  };

  async run(): Promise<void> {
    const { yamlImpl } = await import("../../commands-impl/aqua/yml.js");
    await yamlImpl.bind(this)(Yaml);
  }
}
