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

import { beautify } from "@fluencelabs/air-beautify-wasm";
import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { compile } from "../../lib/aqua.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  AQUA_EXT,
  aquaLogLevelsString,
  IMPORT_FLAG,
  TRACING_FLAG,
} from "../../lib/const.js";
import { ensureAquaImports } from "../../lib/helpers/aquaImports.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveAbsoluteAquaPath, validatePath } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";

const FUNC_FLAG_NAME = "func";

export default class Beautify extends BaseCommand<typeof Beautify> {
  static override aliases = ["aqua:b"];
  static override description =
    "Compiles Aqua function call and prints AIR in human-readable Python-like representation. This representation cannot be executed and is intended to be read by mere mortals.";
  static override flags = {
    ...baseFlags,
    [FUNC_FLAG_NAME]: Flags.string({
      char: "f",
      description: "Function call to compile",
      helpValue: "<function-call>",
    }),
    input: Flags.string({
      description: `Path to an aqua file or an input directory that contains your .${AQUA_EXT} files. Must be relative to the current working directory or absolute`,
      helpValue: "<path>",
      char: "i",
    }),
    ...IMPORT_FLAG,
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
    ...TRACING_FLAG,
  };
  static override args = {
    PATH: Args.string({
      description: "Path to aqua script",
    }),
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Beautify)
    );

    const func =
      flags.func === undefined
        ? await input({
            message: `Enter a function call that you want to compile. Example: ${color.yellow(
              'func("arg")'
            )}`,
            flagName: FUNC_FLAG_NAME,
          })
        : flags.func;

    const inputFlag = await resolveAbsoluteAquaPath({
      maybePathFromFlags: flags.input,
      maybePathFromFluenceYaml: maybeFluenceConfig?.aquaInputPath,
      inputArg: {
        message: `Enter path to an aqua file or an input directory that contains your .${AQUA_EXT} files`,
        flagName: "input",
        validate: validatePath,
      },
    });

    const importFlag = await ensureAquaImports({
      flags,
      maybeFluenceConfig,
    });

    const result = await compile({
      filePath: inputFlag,
      funcCall: func,
      constants: flags.const,
      imports: importFlag,
      logLevel: flags["log-level-compiler"],
      noRelay: flags["no-relay"],
      noXor: flags["no-xor"],
      tracing: flags.tracing,
    });

    if (result.errors.length > 0) {
      return commandObj.error(result.errors.join("\n"));
    }

    commandObj.log(beautify(result.functionCall.script));
  }
}
