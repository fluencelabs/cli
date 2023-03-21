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

import { isAbsolute, resolve } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Command, Flags } from "@oclif/core";
import chokidar from "chokidar";

import { AquaCompilerFlags, initAquaCli } from "../lib/aquaCli.js";
import { commandObj } from "../lib/commandObj.js";
import { initFluenceLockConfig } from "../lib/configs/project/fluenceLock.js";
import {
  aquaLogLevelsString,
  FLUENCE_CONFIG_FILE_NAME,
  IMPORT_FLAG,
  NO_INPUT_FLAG,
} from "../lib/const.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { initCli } from "../lib/lifeCycle.js";
import { projectRootDir, validatePath } from "../lib/paths.js";
import { input, InputArg } from "../lib/prompt.js";

export default class Aqua extends Command {
  static override description =
    "Compile aqua file or directory that contains your .aqua files";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    /* Fluence CLI flags */
    watch: Flags.boolean({
      description: "Watch aqua file or folder for changes and recompile",
      char: "w",
    }),
    "common-js": Flags.boolean({
      description: "Use no extension in generated .ts file",
    }),
    ...NO_INPUT_FLAG,

    /* Aqua CLI flags */
    input: Flags.string({
      description:
        "Path to an aqua file or an input directory that contains your .aqua files. Must be relative to the current working directory or absolute",
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
      description: "Generate .air file instead of .ts",
    }),
    js: Flags.boolean({
      description: "Generate .js file instead of .ts",
    }),
    "old-fluence-js": Flags.boolean({
      description: "Generate TypeScript or JavaScript files for new JS Client",
      default: false,
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
      description: "Do not generate a pass through the relay node",
    }),
    "no-xor": Flags.boolean({
      description: "Do not generate a wrapper that catches and displays errors",
    }),
    dry: Flags.boolean({
      description: "Checks if compilation is succeeded, without output",
    }),
    scheduled: Flags.boolean({
      description:
        "Generate air code for script storage. Without error handling wrappers and hops on relay. Will ignore other options",
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Aqua)
    );

    const maybeFluenceLockConfig = await initFluenceLockConfig();

    const inputFlag = await resolveAbsoluteAquaPath({
      maybePathFromFlags: flags.input,
      maybePathFromFluenceYaml: maybeFluenceConfig?.aquaInputPath,
      inputArg: {
        message:
          "Enter path to an aqua file or an input directory that contains your .aqua files",
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
              "Enter path to the output directory. Will be created if it doesn't exists",
            flagName: "output",
          },
        });

    const jsFlag =
      flags.js ??
      (flags.output === undefined
        ? maybeFluenceConfig?.aquaOutputJSPath !== undefined
        : false);

    const importFlag = await ensureAquaImports({
      flags,
      maybeFluenceConfig,
      maybeFluenceLockConfig,
    });

    const aquaCliFlags = {
      input: inputFlag,
      output: outputFlag,
      js: jsFlag,
      import: importFlag,
      "log-level": flags["log-level-compiler"],
      "no-relay": flags["no-relay"],
      "no-xor": flags["no-xor"],
      "old-fluence-js": flags["old-fluence-js"],
      air: flags.air,
      const: flags.const,
      dry: flags.dry,
      scheduled: flags.scheduled,
    } satisfies AquaCompilerFlags;

    const aquaCli = await initAquaCli(
      maybeFluenceConfig,
      maybeFluenceLockConfig
    );

    const compile = async (): Promise<string> =>
      aquaCli({ flags: aquaCliFlags }, "Compiling");

    if (!flags.watch) {
      this.log(await compile());
      return;
    }

    const watchingNotification = (): void =>
      this.log(
        `Watching for changes at ${color.yellow(aquaCliFlags.input)}...`
      );

    watchingNotification();

    chokidar
      .watch(aquaCliFlags.input, {
        followSymlinks: false,
        usePolling: false,
        interval: 100,
        binaryInterval: 300,
        ignoreInitial: true,
      })
      .on("all", (): void => {
        compile()
          .then((output): void => {
            this.log(output);
            watchingNotification();
          })
          .catch((error): void => {
            commandObj.log(String(error));
            return watchingNotification();
          });
      });
  }
}

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
        `Path ${maybePathFromFluenceYaml} in ${FLUENCE_CONFIG_FILE_NAME} must not be absolute, but should be relative to the project root directory`
      );
    }

    return resolve(projectRootDir, maybePathFromFluenceYaml);
  }

  const pathFromUserInput = await input(inputArg);

  if (isAbsolute(pathFromUserInput)) {
    return pathFromUserInput;
  }

  return resolve(pathFromUserInput);
};
