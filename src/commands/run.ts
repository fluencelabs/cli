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

import { BaseCommand, baseFlags } from "../baseCommand.js";
import {
  FLUENCE_CLIENT_FLAGS,
  FUNC_CALL_EXAMPLE,
  FUNC_FLAG_NAME,
  IMPORT_FLAG,
  INPUT_FLAG_NAME,
  KEY_PAIR_FLAG,
  LOG_LEVEL_COMPILER_FLAG_NAME,
  OFF_AQUA_LOGS_FLAG,
  TRACING_FLAG,
  aquaLogLevelsString,
} from "../lib/const.js";

export default class Run extends BaseCommand<typeof Run> {
  static override description = "Run aqua script";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    data: Flags.string({
      description:
        "JSON in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<json>",
    }),
    "data-path": Flags.file({
      description:
        "Path to a JSON file in { [argumentName]: argumentValue } format. You can call a function using these argument names",
      helpValue: "<path>",
    }),
    ...IMPORT_FLAG,
    [LOG_LEVEL_COMPILER_FLAG_NAME]: Flags.string({
      description: `Set log level for the compiler. Must be one of: ${aquaLogLevelsString}`,
      helpValue: "<level>",
    }),
    quiet: Flags.boolean({
      default: false,
      description:
        "Print only execution result. Overrides all --log-level-* flags",
    }),
    const: Flags.string({
      description:
        'Constant that will be used in the aqua code that you run (example of aqua code: SOME_CONST ?= "default_value"). Constant name must be upper cased.',
      helpValue: "<NAME = value>",
      multiple: true,
    }),
    // TODO: DXJ-207
    // [ON_FLAG_NAME]: Flags.string({
    //   description: "PeerId of a peer where you want to run the function",
    //   helpValue: "<peer_id>",
    // }),
    [INPUT_FLAG_NAME]: Flags.string({
      description:
        "Path to an aqua file or to a directory that contains aqua files",
      helpValue: "<path>",
      char: "i",
    }),
    [FUNC_FLAG_NAME]: Flags.string({
      char: "f",
      description: `Function call. Example: ${FUNC_CALL_EXAMPLE}`,
      helpValue: "<function-call>",
    }),
    "no-xor": Flags.boolean({
      default: false,
      description: "Do not generate a wrapper that catches and displays errors",
    }),
    "no-relay": Flags.boolean({
      default: false,
      description: "Do not generate a pass through the relay node",
    }),
    "print-air": Flags.boolean({
      default: false,
      description: "Prints generated AIR code before function execution",
      exclusive: ["print-beautified-air"],
    }),
    "print-beautified-air": Flags.boolean({
      default: false,
      description: "Prints beautified AIR code before function execution",
      char: "b",
      exclusive: ["print-air"],
    }),
    ...OFF_AQUA_LOGS_FLAG,
    ...KEY_PAIR_FLAG,
    ...FLUENCE_CLIENT_FLAGS,
    ...TRACING_FLAG,
  };
  async run(): Promise<void> {
    const { runImpl } = await import("../commands-impl/run.js");
    await runImpl.bind(this)(Run);
  }
}
