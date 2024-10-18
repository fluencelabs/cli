/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
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
import { initFluenceConfig } from "../lib/configs/project/fluence.js";
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
    const { flags } = await initCli(this, await this.parse(Aqua));
    const fluenceConfig = await initFluenceConfig();
    const commonFlags = await resolveCommonAquaCompilationFlags(flags);

    if (
      flags[INPUT_FLAG_NAME] === undefined &&
      hasAquaToCompile(fluenceConfig)
    ) {
      await compileAquaFromFluenceConfig({
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
  const filePath = await resolveAbsoluteAquaPathFromCwd({
    maybePathFromFlags: input,
    inputArg: {
      message: `Enter path to an aqua file or an input directory that contains your aqua files`,
      flagName: "input",
      validate: validatePath,
    },
  });

  const outputPathAbsolute = flags.dry
    ? undefined
    : await resolveAbsoluteAquaPathFromCwd({
        maybePathFromFlags: output,
        inputArg: {
          message:
            "Enter path to the output directory. Will be created if it doesn't exists (press Enter to use the current working directory)",
          flagName: "output",
        },
      });

  const targetType = resolveTargetType(flags);

  await compileAquaAndWatch({
    filePath,
    targetType,
    outputPathAbsolute,
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

async function resolveAbsoluteAquaPathFromCwd({
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
