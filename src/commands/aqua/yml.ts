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
import { CUSTOM_TYPES_FLAG, USE_F64_FLAG, AQUA_EXT } from "../../lib/const.js";
import { fileToAqua } from "../../lib/helpers/jsToAqua.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Yaml extends BaseCommand<typeof Yaml> {
  static override aliases = ["aqua:yaml"];
  static override description =
    "Infers aqua types for an arbitrary yaml file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the yaml file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into";
  static override flags = {
    ...baseFlags,
    ...USE_F64_FLAG,
    ...CUSTOM_TYPES_FLAG,
  };
  static override args = {
    INPUT: Args.string({
      description: "Path to yaml file",
    }),
    OUTPUT: Args.string({
      description: `Path to the output file (must have .${AQUA_EXT} extension)`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Yaml));
    const { parse } = await import("yaml");
    await fileToAqua(args.INPUT, args.OUTPUT, flags.f64, flags.types, parse);
  }
}
