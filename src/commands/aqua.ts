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

import { color } from "@oclif/color";
import { Command, Flags } from "@oclif/core";

import { compileToFiles, type CompileToFilesArgs } from "../lib/aqua.js";
import { commandObj } from "../lib/commandObj.js";
import {
  AQUA_EXT,
  aquaLogLevelsString,
  IMPORT_FLAG,
  NO_INPUT_FLAG,
  TRACING_FLAG,
  FLUENCE_CONFIG_FULL_FILE_NAME,
} from "../lib/const.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { stringifyUnknown } from "../lib/helpers/utils.js";
import { initCli, exitCli } from "../lib/lifeCycle.js";
import { projectRootDir, validatePath } from "../lib/paths.js";
import { input, type InputArg } from "../lib/prompt.js";

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
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Aqua),
    );

    const inputFlag = await resolveAbsoluteAquaPath({
      maybePathFromFlags: flags.input,
      maybePathFromFluenceYaml: maybeFluenceConfig?.aquaInputPath,
      inputArg: {
        message: `Enter path to an aqua file or an input directory that contains your .${AQUA_EXT} files`,
        flagName: "input",
        validate: validatePath,
      },
    });

    const outputFlag = flags.dry
      ? undefined
      : await resolveAbsoluteAquaPath({
          maybePathFromFlags: flags.output,
          maybePathFromFluenceYaml:
            maybeFluenceConfig?.aquaOutputTSPath ??
            maybeFluenceConfig?.aquaOutputJSPath,
          inputArg: {
            message:
              "Enter path to the output directory. Will be created if it doesn't exists (press Enter to use the current working directory)",
            flagName: "output",
          },
        });

    const jsFlag =
      flags.js ||
      (flags.output === undefined &&
        maybeFluenceConfig?.aquaOutputJSPath !== undefined);

    const importFlag = await ensureAquaImports({
      flags,
      maybeFluenceConfig,
    });

    const targetType = resolveTargetType(jsFlag, flags.air);

    const compileCommandArgs: CompileToFilesArgs = {
      compileArgs: {
        filePath: inputFlag,
        constants: flags.const,
        imports: importFlag,
        logLevel: flags["log-level-compiler"],
        noRelay: flags["no-relay"],
        noXor: flags["no-xor"],
        targetType,
        tracing: flags.tracing,
      },
      outputPath: outputFlag,
      dry: flags.dry,
    };

    if (!flags.watch) {
      await compileToFiles(compileCommandArgs);

      commandObj.logToStderr(
        `Successfully compiled ${color.yellow(
          compileCommandArgs.compileArgs.filePath,
        )}${
          compileCommandArgs.outputPath === undefined
            ? ""
            : `\nto ${color.yellow(compileCommandArgs.outputPath)}`
        }`,
      );

      await exitCli();
      return;
    }

    const watchingNotification = (): void => {
      commandObj.logToStderr(
        `Watching for changes at ${color.yellow(inputFlag)}...`,
      );
    };

    const chokidar = await import("chokidar");
    watchingNotification();

    chokidar
      .watch(inputFlag, {
        followSymlinks: false,
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
        ignoreInitial: true,
      })
      .on("all", (): void => {
        compileToFiles(compileCommandArgs)
          .then((): void => {
            watchingNotification();
          })
          .catch((error): void => {
            commandObj.logToStderr(stringifyUnknown(error));
            watchingNotification();
          });
      });
  }
}

const resolveTargetType = (js: boolean, air: boolean): "ts" | "js" | "air" => {
  if (js) {
    return "js";
  }

  if (air) {
    return "air";
  }

  return "ts";
};

type ResolveAbsoluteAquaPathArg = {
  maybePathFromFlags: string | undefined;
  maybePathFromFluenceYaml: string | undefined;
  inputArg: InputArg;
};

const resolveAbsoluteAquaPath = async ({
  maybePathFromFlags,
  maybePathFromFluenceYaml,
  inputArg,
}: ResolveAbsoluteAquaPathArg) => {
  if (maybePathFromFlags !== undefined) {
    if (isAbsolute(maybePathFromFlags)) {
      return maybePathFromFlags;
    }

    return resolve(maybePathFromFlags);
  }

  if (maybePathFromFluenceYaml !== undefined) {
    if (isAbsolute(maybePathFromFluenceYaml)) {
      return commandObj.error(
        `Path ${maybePathFromFluenceYaml} in ${FLUENCE_CONFIG_FULL_FILE_NAME} must not be absolute, but should be relative to the project root directory`,
      );
    }

    return resolve(projectRootDir, maybePathFromFluenceYaml);
  }

  // By default input for aqua is set in fluence.yaml
  // If it's not set (user removed it for some reason from fluence.yaml)
  // or there is no fluence.yaml at all - then there is a need to provide path to the input for aqua compilation
  // By default it's suggest to use current working directory as input for aqua compilation
  // But user can pass a flag to provide a different path or provide the path interactively when prompted
  const pathFromUserInput = await input({ ...inputArg, default: cwd() });

  if (isAbsolute(pathFromUserInput)) {
    return pathFromUserInput;
  }

  return resolve(pathFromUserInput);
};
