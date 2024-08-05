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

import assert from "node:assert";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, parse, resolve } from "node:path";

import type {
  CompileFromPathArgs,
  CompileFuncCallFromPathArgs,
} from "@fluencelabs/aqua-api";
import type { GatherImportsResult } from "@fluencelabs/npm-aqua-compiler";
import { color } from "@oclif/color";

import CLIPackageJSON from "../versions/cli.package.json" assert { type: "json" };

import { commandObj } from "./commandObj.js";
import type {
  CompileAquaConfig,
  Constants,
  FluenceConfig,
} from "./configs/project/fluence.js";
import { LOG_LEVEL_COMPILER_FLAG_NAME } from "./const.js";
import {
  type CommonAquaCompilationFlags,
  FS_OPTIONS,
  JS_EXT,
  TS_EXT,
  CLI_NAME,
  AQUA_LOG_LEVELS,
  aquaLogLevelsString,
  isAquaLogLevel,
  type AquaLogLevel,
} from "./const.js";
import { getAquaImports } from "./helpers/aquaImports.js";
import { boolToStr, numToStr } from "./helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "./helpers/utils.js";
import { projectRootDir } from "./paths.js";
import { list } from "./prompt.js";
import type { Required } from "./typeHelpers.js";

const getAquaFilesRecursively = async (dirPath: string): Promise<string[]> => {
  const files = await readdir(dirPath);

  const pathsWithStats = await Promise.all(
    files.map(async (fileName) => {
      const filePath = join(dirPath, fileName);
      const stats = await stat(filePath);
      return [filePath, stats] as const;
    }),
  );

  return (
    await Promise.all(
      pathsWithStats
        .filter(([path, stats]) => {
          return stats.isDirectory() || extname(path).toLowerCase() === ".aqua";
        })
        .map(([path, stats]): Promise<string[]> => {
          return stats.isDirectory()
            ? getAquaFilesRecursively(path)
            : Promise.resolve([path]);
        }),
    )
  ).flat();
};

const writeFileAndMakeSureDirExists = async (
  filePath: string,
  dataPromise: string | Promise<string | undefined>,
) => {
  const data = await dataPromise;

  if (data === undefined) {
    return;
  }

  const dirPath = parse(filePath).dir;
  await mkdir(dirPath, { recursive: true });
  await writeFile(filePath, data, FS_OPTIONS);
};

let hasLoggedCompilerVersion = false;

export async function importAquaCompiler() {
  if (!hasLoggedCompilerVersion) {
    commandObj.logToStderr(
      color.blue(
        `Using aqua compiler version: ${CLIPackageJSON.dependencies["@fluencelabs/aqua-api"]}`,
      ),
    );

    hasLoggedCompilerVersion = true;
  }

  return import("@fluencelabs/aqua-api");
}

export type CompileToFilesArgs = CompileFromPathArgs & {
  outputPathAbsolute: string | undefined;
  dry?: boolean;
};

export async function compileToFiles({
  outputPathAbsolute,
  targetType,
  dry = false,
  ...compileArgs
}: CompileToFilesArgs): Promise<void> {
  const isInputPathADirectory = (
    await stat(compileArgs.filePath)
  ).isDirectory();

  const { compileFromPath } = await importAquaCompiler();

  const [resultsWithErrors, compilationResultsWithFilePaths] =
    await compileDirOrFile(compileFromPath, compileArgs);

  if (resultsWithErrors.length !== 0) {
    return commandObj.error(
      resultsWithErrors
        .map(({ compilationResult, aquaFilePath }) => {
          const possiblyForgotToInstallDependenciesText =
            compilationResult.errors.some((e) => {
              return e.includes("Cannot resolve imports");
            })
              ? possiblyForgotToInstallDependenciesError
              : "";

          return `${color.yellow(
            aquaFilePath,
          )}\n\n${compilationResult.errors.join(
            "\n",
          )}${possiblyForgotToInstallDependenciesText}`;
        })
        .join("\n\n"),
    );
  }

  if (compilationResultsWithFilePaths.length === 0) {
    return commandObj.error(`No aqua files found at ${compileArgs.filePath}`);
  }

  if (dry) {
    return;
  }

  assert(
    typeof outputPathAbsolute === "string",
    `Unreachable. outputPath type is "${typeof outputPathAbsolute}", but it should have been of type "string", because it's not dry run`,
  );

  await mkdir(outputPathAbsolute, { recursive: true });

  const inputDirPath = isInputPathADirectory
    ? compileArgs.filePath
    : parse(compileArgs.filePath).dir;

  const aquaToJs = (await import("@fluencelabs/aqua-to-js")).default;

  await Promise.all(
    compilationResultsWithFilePaths.flatMap(
      ({ compilationResult, aquaFilePath }) => {
        const parsedPath = parse(aquaFilePath);
        const fileNameWithoutExt = parsedPath.name;
        const dirPath = parsedPath.dir;

        const finalOutputDirPath = dirPath.replace(
          inputDirPath,
          outputPathAbsolute,
        );

        if (targetType === "ts") {
          return [
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${TS_EXT}`),
              aquaToJs(compilationResult, "ts").then((r) => {
                return r?.sources;
              }),
            ),
          ];
        }

        if (targetType === "js") {
          const aquaToJsPromise = aquaToJs(compilationResult, "js");

          return [
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${JS_EXT}`),
              aquaToJsPromise.then((r) => {
                return r?.sources;
              }),
            ),
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.d.${TS_EXT}`),
              aquaToJsPromise.then((r) => {
                return r?.types;
              }),
            ),
          ];
        }

        return Object.entries(compilationResult.functions).map(
          ([name, { script }]) => {
            return writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${name}.air`),
              script,
            );
          },
        );
      },
    ),
  );
}

export async function compileFunctionCall(args: CompileFuncCallFromPathArgs) {
  const { compileAquaCallFromPath } = await importAquaCompiler();
  return compileDirOrFile(compileAquaCallFromPath, args);
}

// TODO: think about the way to improve this https://github.com/fluencelabs/cli/pull/743#discussion_r1475857293
async function compileDirOrFile<
  T extends { filePath: string },
  U extends { errors: string[] },
>(fn: (args: T) => Promise<U>, compileArgs: T) {
  const isDir = (await stat(compileArgs.filePath)).isDirectory();

  const compilationResultsWithFilePaths = isDir
    ? await Promise.all(
        (await getAquaFilesRecursively(compileArgs.filePath)).map(
          async (aquaFilePath) => {
            return {
              compilationResult: await fn({
                ...compileArgs,
                filePath: aquaFilePath,
              }),
              aquaFilePath,
            };
          },
        ),
      )
    : [
        {
          compilationResult: await fn(compileArgs),
          aquaFilePath: compileArgs.filePath,
        },
      ];

  return splitErrorsAndResults(compilationResultsWithFilePaths, (result) => {
    return result.compilationResult.errors.length === 0
      ? { result }
      : { error: result };
  });
}

const possiblyForgotToInstallDependenciesError = `
--------------------------------------------------------------------------------


Also make sure you installed dependencies using ${color.yellow(
  `${CLI_NAME} dep i`,
)}


--------------------------------------------------------------------------------
`;

const CONST_SEPARATOR = " = ";

function formatConstantsFromFlags(
  constants: string[] | undefined = [],
): string[] | undefined {
  const [errors, results] = splitErrorsAndResults(constants, (c) => {
    if (!c.includes("=")) {
      return {
        error: c,
      };
    }

    return {
      result: c
        .split("=")
        .map((s) => {
          return s.trim();
        })
        .join(CONST_SEPARATOR),
    };
  });

  if (errors.length !== 0) {
    commandObj.error(
      `Invalid --const flag values: ${color.yellow(
        errors.join(", "),
      )}. Must be in format <name> = <value>`,
    );
  }

  return results;
}

function formatConstantsFromConfig(constants: Constants) {
  return Object.entries(constants).map(([name, value]) => {
    const val =
      typeof value === "string"
        ? `"${value}"`
        : typeof value === "number"
          ? numToStr(value)
          : boolToStr(value);

    return `${name}${CONST_SEPARATOR}${val}`;
  });
}

// Required is used to make sure that we didn't forget to appropriately handle all aqua args
export type ResolvedAquaConfig = Required<CompileFromPathArgs>;

export function resolveAquaConfig(
  compileAquaConfig: CompileAquaConfig,
  imports: CompileFromPathArgs["imports"],
): ResolvedAquaConfig {
  return {
    imports,
    filePath: resolve(projectRootDir, compileAquaConfig.input),
    targetType: compileAquaConfig.target,
    logLevel: compileAquaConfig.logLevel,
    noRelay: compileAquaConfig.noRelay,
    noXor: compileAquaConfig.noXor,
    tracing: compileAquaConfig.tracing,
    noEmptyResponse: compileAquaConfig.noEmptyResponse,
    constants:
      compileAquaConfig.constants === undefined
        ? undefined
        : formatConstantsFromConfig(compileAquaConfig.constants),
  };
}

// Required is used to make sure that we didn't forget to appropriately handle all aqua args
export type ResolvedCommonAquaCompilationFlags = Required<
  Omit<CompileFromPathArgs, "targetType" | "filePath" | "imports"> & {
    imports: GatherImportsResult;
  }
>;

export async function resolveCommonAquaCompilationFlags(
  flags: CommonAquaCompilationFlags & { quiet?: boolean },
  fluenceConfig: FluenceConfig | null,
): Promise<ResolvedCommonAquaCompilationFlags> {
  return {
    imports: await getAquaImports({
      aquaImportsFromFlags: flags.import,
      fluenceConfig,
    }),
    constants: formatConstantsFromFlags(flags.const),
    logLevel: await resolveAquaLogLevel(
      flags["log-level-compiler"],
      flags["quiet"] ?? false,
    ),
    noRelay: flags["no-relay"],
    noXor: flags["no-xor"],
    tracing: flags.tracing,
    noEmptyResponse: flags["no-empty-response"],
  };
}

async function resolveAquaLogLevel(
  maybeAquaLogLevel: string | undefined,
  isQuite: boolean,
): Promise<AquaLogLevel | undefined> {
  if (isQuite) {
    return "off";
  }

  if (maybeAquaLogLevel === undefined) {
    return undefined;
  }

  if (isAquaLogLevel(maybeAquaLogLevel)) {
    return maybeAquaLogLevel;
  }

  commandObj.warn(
    `Invalid --${LOG_LEVEL_COMPILER_FLAG_NAME} flag value: '${maybeAquaLogLevel}' ${aquaLogLevelsString}`,
  );

  return list({
    message: "Select a valid compiler log level",
    oneChoiceMessage() {
      throw new Error("Unreachable");
    },
    onNoChoices() {
      throw new Error("Unreachable");
    },
    options: [...AQUA_LOG_LEVELS],
  });
}
