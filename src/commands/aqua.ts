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

import { isAbsolute, resolve } from "path";
import { cwd } from "process";

import { Command, Flags } from "@oclif/core";

import {
  resolveCommonAquaCompilationFlags,
  type ResolvedCommonAquaCompilationFlags,
} from "../lib/aqua.js";
import {
  hasAquaToCompile,
  compileAquaFromFluenceConfig,
  compileAquaAndWatch,
} from "../lib/compileAquaAndWatch.js";
import {
  INPUT_FLAG_EXPLANATION,
  COMPILE_AQUA_PROPERTY_NAME,
  COMMON_AQUA_COMPILATION_FLAGS,
  NO_INPUT_FLAG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  INPUT_FLAG_NAME,
} from "../lib/const.js";
import { initCli, exitCli } from "../lib/lifeCycle.js";
import { validatePath } from "../lib/paths.js";
import { input, type InputArg } from "../lib/prompt.js";

/**
 * This command doesn't extend BaseCommand like other commands do because it
 * has a --watch flag which should keep cli alive
 * This means we have to manually call exitCli() in all other cases before
 * the final return statement
 */
export default class Aqua extends Command {
  static override description = `Compile aqua defined in '${COMPILE_AQUA_PROPERTY_NAME}' property of ${FLUENCE_CONFIG_FULL_FILE_NAME}${INPUT_FLAG_EXPLANATION}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    names: Flags.string({
      description: `Comma-separated names of the configs from '${COMPILE_AQUA_PROPERTY_NAME}' property of ${FLUENCE_CONFIG_FULL_FILE_NAME} to compile. If not specified, all configs will be compiled`,
      char: "n",
    }),
    ...NO_INPUT_FLAG,
    watch: Flags.boolean({
      default: false,
      description: "Watch aqua file or folder for changes and recompile",
      char: "w",
    }),
    output: Flags.string({
      description:
        "Path to the output directory. Must be relative to the current working directory or absolute. Will be created if it doesn't exists",
      helpValue: "<path>",
      char: "o",
    }),
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
    ...COMMON_AQUA_COMPILATION_FLAGS,
    dry: Flags.boolean({
      default: false,
      description: "Checks if compilation succeeded, without output",
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig: fluenceConfig } = await initCli(
      this,
      await this.parse(Aqua),
    );

    const commonFlags = await resolveCommonAquaCompilationFlags(
      flags,
      fluenceConfig,
    );

    if (
      flags[INPUT_FLAG_NAME] === undefined &&
      hasAquaToCompile(fluenceConfig)
    ) {
      await compileAquaFromFluenceConfig({
        fluenceConfig,
        imports: commonFlags.imports,
        names: flags.names,
        dry: flags.dry,
        watch: flags.watch,
      });

      await exitCli();
      return;
    }

    await compileAquaFromFlags({ ...commonFlags, ...flags });
  }
}

async function compileAquaFromFlags({
  input,
  output,
  ...flags
}: ResolvedCommonAquaCompilationFlags & {
  input: string | undefined;
  output: string | undefined;
  dry: boolean;
  js: boolean;
  air: boolean;
  watch: boolean;
}) {
  const inputFlag = await resolveAbsoluteAquaPath({
    maybePathFromFlags: input,
    inputArg: {
      message: `Enter path to an aqua file or an input directory that contains your aqua files`,
      flagName: "input",
      validate: validatePath,
    },
  });

  const outputFlag = flags.dry
    ? undefined
    : await resolveAbsoluteAquaPath({
        maybePathFromFlags: output,
        inputArg: {
          message:
            "Enter path to the output directory. Will be created if it doesn't exists (press Enter to use the current working directory)",
          flagName: "output",
        },
      });

  const targetType = resolveTargetType(flags);

  await compileAquaAndWatch({
    filePath: inputFlag,
    targetType,
    outputPath: outputFlag,
    ...flags,
  });

  if (!flags.watch) {
    await exitCli();
  }
}

type ResolveTargetTypeArgs = {
  js: boolean;
  air: boolean;
};

function resolveTargetType({
  js,
  air,
}: ResolveTargetTypeArgs): "ts" | "js" | "air" {
  if (js) {
    return "js";
  }

  if (air) {
    return "air";
  }

  return "ts";
}

type ResolveAbsoluteAquaPathArg = {
  maybePathFromFlags: string | undefined;
  inputArg: InputArg;
};

async function resolveAbsoluteAquaPath({
  maybePathFromFlags,
  inputArg,
}: ResolveAbsoluteAquaPathArg) {
  if (maybePathFromFlags !== undefined) {
    if (isAbsolute(maybePathFromFlags)) {
      return maybePathFromFlags;
    }

    return resolve(maybePathFromFlags);
  }

  const pathFromUserInput = await input({ ...inputArg, default: cwd() });

  if (isAbsolute(pathFromUserInput)) {
    return pathFromUserInput;
  }

  return resolve(pathFromUserInput);
}
