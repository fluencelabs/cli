/**
 * Copyright 2022 Fluence Labs Limited
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

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Command, Flags } from "@oclif/core";
import chokidar from "chokidar";

import { initAquaCli } from "../lib/aquaCli.js";
import { commandObj } from "../lib/commandObj.js";
import {
  defaultFluenceLockConfig,
  initFluenceLockConfig,
  initNewFluenceLockConfig,
} from "../lib/configs/project/fluenceLock.js";
import {
  aquaLogLevelsString,
  FS_OPTIONS,
  NO_INPUT_FLAG,
} from "../lib/const.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { exitCli, initCli } from "../lib/lifecyle.js";
import { validatePath } from "../lib/paths.js";
import { input } from "../lib/prompt.js";

export default class Aqua extends Command {
  static override description =
    "Compile aqua file or directory that contains your .aqua files";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    input: Flags.string({
      description:
        "Path to an aqua file or an input directory that contains your .aqua files",
      helpValue: "<path>",
      char: "i",
    }),
    output: Flags.string({
      description:
        "Path to the output directory. Will be created if it doesn't exists",
      helpValue: "<path>",
      char: "o",
    }),
    import: Flags.string({
      description:
        "Path to a directory to import from. May be used several times",
      helpValue: "<path>",
      multiple: true,
    }),
    air: Flags.boolean({
      description: "Generate .air file instead of .ts",
      exclusive: ["js", "common-js"],
    }),
    js: Flags.boolean({
      description: "Generate .js file instead of .ts",
      exclusive: ["air"],
    }),
    "common-js": Flags.boolean({
      description: "Use no extension in generated .ts file",
      exclusive: ["air"],
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
    watch: Flags.boolean({
      description: "Watch aqua file or folder for changes and recompile",
      char: "w",
    }),
    ...NO_INPUT_FLAG,
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Aqua)
    );

    const {
      watch,
      input: inputPath = maybeFluenceConfig?.aquaInputPath ??
        (await input({
          message:
            "Enter path to an aqua file or an input directory that contains your .aqua files",
          flagName: "input",
          validate: validatePath,
        })),
      output: outputPath = flags.dry
        ? undefined
        : maybeFluenceConfig?.aquaOutputTSPath ??
          maybeFluenceConfig?.aquaOutputJSPath ??
          (await input({
            message:
              "Enter path to the output directory. Will be created if it doesn't exists",
            flagName: "input",
          })),
      js = flags.js ??
        (flags.output === undefined
          ? maybeFluenceConfig?.aquaOutputJSPath !== undefined
          : false),
      "log-level-compiler": logLevelCompiler,
      "common-js": isCommonJs,
      ...aquaCliOptionalFlags
    } = flags;

    const maybeFluenceLockConfig = await initFluenceLockConfig();

    const aquaImports =
      maybeFluenceConfig === null
        ? await ensureAquaImports({
            flags,
            maybeFluenceConfig,
            maybeFluenceLockConfig: null,
          })
        : await ensureAquaImports({
            flags,
            maybeFluenceConfig,
            maybeFluenceLockConfig:
              maybeFluenceLockConfig ??
              (await initNewFluenceLockConfig(defaultFluenceLockConfig)),
          });

    const aquaCliFlags = {
      input: path.resolve(inputPath),
      output: resolveOutputPath(outputPath),
      js,
      ...aquaCliOptionalFlags,
      import: aquaImports,
      "log-level": logLevelCompiler,
    };

    const aquaCli = await initAquaCli(
      maybeFluenceConfig,
      maybeFluenceLockConfig
    );

    const compile = async (): Promise<string> => {
      const result = await aquaCli({ flags: aquaCliFlags }, "Compiling");

      if (
        !isCommonJs &&
        !aquaCliFlags.js &&
        aquaCliFlags.output !== undefined
      ) {
        await addFileExtensionsInTsFiles(aquaCliFlags.output);
      }

      return result;
    };

    if (!watch) {
      this.log(await compile());
      await exitCli();
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

const resolveOutputPath = (
  maybeOutputPath: string | undefined
): string | undefined => {
  if (maybeOutputPath === undefined) {
    return undefined;
  }

  const outputPath = maybeOutputPath;

  if (path.isAbsolute(outputPath)) {
    return outputPath;
  }

  return path.resolve(outputPath);
};

const addFileExtensionsInTsFiles = async (outputDirPath: string) => {
  const dirContent = await readdir(outputDirPath, FS_OPTIONS);

  await Promise.all(
    dirContent
      .filter((file) => file.endsWith(".ts"))
      .map((fileName) =>
        (async () => {
          const filePath = path.join(outputDirPath, fileName);
          const content = await readFile(filePath, FS_OPTIONS);
          return writeFile(
            filePath,
            content.replaceAll(
              // we will do this until we update aqua to generate correct imports for new js-client
              "@fluencelabs/fluence/dist/internal/compilerSupport/v4'",
              "@fluencelabs/fluence/dist/internal/compilerSupport/v4.js'"
            )
          );
        })()
      )
  );
};
