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

import { Command, Flags } from "@oclif/core";

import {
  AQUA_EXT,
  IMPORT_FLAG,
  NO_INPUT_FLAG,
  TRACING_FLAG,
  aquaLogLevelsString,
} from "../lib/const.js";

/**
 * This command doesn't extend BaseCommand like other commands do because it
 * has a --watch flag which should keep cli alive
 * This means we have to manually call exitCli() in all other cases before
 * the final return statement
 */
export default class Aqua extends Command {
  static override description = `Compile aqua file or directory that contains your .${AQUA_EXT} files`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    watch: Flags.boolean({
      default: false,
      description: "Watch aqua file or folder for changes and recompile",
      char: "w",
    }),
    "common-js": Flags.boolean({
      default: false,
      description: "Use no extension in generated .ts file imports",
    }),
    ...NO_INPUT_FLAG,
    input: Flags.string({
      description: `Path to an aqua file or an input directory that contains your .${AQUA_EXT} files. Must be relative to the current working directory or absolute`,
      helpValue: "<path>",
      char: "i",
    }),
    output: Flags.string({
      description:
        "Path to the output directory. Must be relative to the current working directory or absolute. Will be created if it doesn't exists",
      helpValue: "<path>",
      char: "o",
    }),
    ...IMPORT_FLAG,
    air: Flags.boolean({
      default: false,
      description: "Generate .air file instead of .ts",
      exclusive: ["js"],
    }),
    js: Flags.boolean({
      default: false,
      description: "Generate .js file instead of .ts",
      exclusive: ["air"],
    }),
    "log-level-compiler": Flags.string({
      description: `Set log level for the compiler. Must be one of: ${aquaLogLevelsString}`,
      helpValue: "<level>",
    }),
    const: Flags.string({
      description: "Constants to be passed to the compiler",
      helpValue: "<NAME=value>",
      multiple: true,
    }),
    "no-relay": Flags.boolean({
      default: false,
      description: "Do not generate a pass through the relay node",
    }),
    "no-xor": Flags.boolean({
      default: false,
      description: "Do not generate a wrapper that catches and displays errors",
    }),
    dry: Flags.boolean({
      default: false,
      description: "Checks if compilation succeeded, without output",
    }),
    ...TRACING_FLAG,
  };
  async run(): Promise<void> {
    const { aquaImpl } = await import("../commands-impl/aqua.js");
    await aquaImpl.bind(this)(Aqua);
  }
}
