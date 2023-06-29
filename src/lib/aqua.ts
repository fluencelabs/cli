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

import assert from "node:assert";
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import { extname, join, parse } from "node:path";

import {
  AquaConfig,
  CompilationResult,
  Aqua,
  Call,
  Input,
  Path,
  GeneratedSource,
} from "@fluencelabs/aqua-api/aqua-api.js";
import type { FnConfig } from "@fluencelabs/js-client.api";
import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { commandObj } from "./commandObj.js";
import { FS_OPTIONS, JS_EXT, TS_EXT } from "./const.js";

type CommonArgs = {
  imports?: string[] | undefined;
  constants?: string[] | undefined;
  logLevel?: string | undefined;
  noRelay?: boolean | undefined;
  noXor?: boolean | undefined;
  targetType?: "ts" | "js" | "air";
  tracing?: boolean | undefined;
};

/**
 * Compile aqua code
 *
 * There are 3 ways to call the function:
 *
 * 1. Compile aqua code from string (use `code` field)
 * 1. Compile aqua code from file (use `filePath` field)
 * 1. Compile aqua function call from file (use `filePath`, `funcCall` and, optionally `data` fields)
 *
 * @param arg Compilation config
 */
export async function compile(
  arg: { code: string } & CommonArgs
): Promise<CompilationResult>;
export async function compile(
  arg: { filePath: string } & CommonArgs
): Promise<CompilationResult>;
export async function compile(
  arg: {
    filePath: string;
    funcCall: string;
    data?: FnConfig | undefined;
  } & CommonArgs
): Promise<Required<CompilationResult>>;

export async function compile({
  funcCall,
  code,
  filePath,
  data = {},
  imports = [],
  constants = [],
  logLevel = "info",
  noRelay = false,
  noXor = false,
  targetType = "air",
  tracing = false,
}: {
  code?: string;
  filePath?: string;
  funcCall?: string;
  data?: FnConfig | undefined;
} & CommonArgs): Promise<CompilationResult> {
  const config = new AquaConfig(
    logLevel,
    constants,
    noXor,
    noRelay,
    {
      ts: "typescript",
      js: "javascript",
      air: "air",
    }[targetType],
    tracing
  );

  if (typeof funcCall === "string" && filePath !== undefined) {
    const result = await Aqua.compile(
      new Call(funcCall, data, new Input(filePath)),
      imports,
      config
    );

    return result;
  }

  if (typeof code === "string") {
    return Aqua.compile(new Input(code), imports, config);
  }

  assert(typeof filePath === "string");
  return Aqua.compile(new Path(filePath), imports, config);
}

const getAquaFilesRecursively = async (dirPath: string): Promise<string[]> => {
  const files = await readdir(dirPath);

  const pathsWithStats = await Promise.all(
    files.map(async (fileName) => {
      const filePath = join(dirPath, fileName);
      const stats = await stat(filePath);
      return [filePath, stats] as const;
    })
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
        })
    )
  ).flat();
};

const writeFileAndMakeSureDirExists = async (
  filePath: string,
  data: string
) => {
  const dirPath = parse(filePath).dir;
  await mkdir(dirPath, { recursive: true });
  await writeFile(filePath, data, FS_OPTIONS);
};

const EMPTY_GENERATED_SOURCE: Omit<GeneratedSource, "name"> = {};

export type CompileToFilesArgs = {
  compileArgs: Omit<Parameters<typeof compile>[0], "funcCall">;
  outputPath: string | undefined;
  dry?: boolean;
};

export const compileToFiles = async ({
  compileArgs,
  outputPath,
  dry = false,
}: CompileToFilesArgs): Promise<void> => {
  const isInputPathADirectory = (
    await stat(compileArgs.filePath)
  ).isDirectory();

  const compilationResultsWithFilePaths = isInputPathADirectory
    ? await Promise.all(
        (
          await getAquaFilesRecursively(compileArgs.filePath)
        ).map(async (aquaFilePath) => {
          return {
            compilationResult: await compile({
              ...compileArgs,
              filePath: aquaFilePath,
            }),
            aquaFilePath,
          };
        })
      )
    : [
        {
          compilationResult: await compile(compileArgs),
          aquaFilePath: compileArgs.filePath,
        },
      ];

  if (compilationResultsWithFilePaths.length === 0) {
    return commandObj.error(`No aqua files found at ${compileArgs.filePath}`);
  }

  const resultsWithErrors = compilationResultsWithFilePaths.filter(
    ({ compilationResult }) => {
      return compilationResult.errors.length !== 0;
    }
  );

  if (resultsWithErrors.length !== 0) {
    return commandObj.error(
      resultsWithErrors
        .map(({ compilationResult, aquaFilePath }) => {
          return `${color.yellow(
            aquaFilePath
          )}\n\n${compilationResult.errors.join("\n")}`;
        })
        .join("\n\n")
    );
  }

  if (dry) {
    return;
  }

  assert(
    typeof outputPath === "string",
    `outputPath type is "${typeof outputPath}", but it should be of type "string", because it's not dry run`
  );

  await rm(outputPath, { recursive: true, force: true });
  await mkdir(outputPath, { recursive: true });

  const inputDirPath = isInputPathADirectory
    ? compileArgs.filePath
    : parse(compileArgs.filePath).dir;

  await Promise.all(
    compilationResultsWithFilePaths.flatMap(
      ({ compilationResult, aquaFilePath }) => {
        const generatedSource =
          compilationResult.generatedSources[0] ?? EMPTY_GENERATED_SOURCE;

        const parsedPath = parse(aquaFilePath);
        const fileNameWithoutExt = parsedPath.name;
        const dirPath = parsedPath.dir;
        const finalOutputDirPath = dirPath.replace(inputDirPath, outputPath);

        if (compileArgs.targetType === "ts") {
          assert(typeof generatedSource.tsSource === "string");
          return [
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${TS_EXT}`),
              generatedSource.tsSource
            ),
          ];
        }

        if (compileArgs.targetType === "js") {
          assert(typeof generatedSource.jsSource === "string");
          assert(typeof generatedSource.tsTypes === "string");
          return [
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${JS_EXT}`),
              generatedSource.jsSource
            ),
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.d.${TS_EXT}`),
              generatedSource.tsTypes
            ),
          ];
        }

        return Object.entries(compilationResult.functions).map(
          ([name, { script }]) => {
            return writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${name}.air`),
              script
            );
          }
        );
      }
    )
  );
};
