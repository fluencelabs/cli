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
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { extname, join, parse } from "node:path";

import type { compileFromPath } from "@fluencelabs/aqua-api";
import { color } from "@oclif/color";

import { commandObj } from "./commandObj.js";
import { FS_OPTIONS, JS_EXT, TS_EXT } from "./const.js";

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

export type CompileToFilesArgs = {
  compileArgs: Omit<Parameters<typeof compileFromPath>[0], "funcCall">;
  outputPath: string | undefined;
  targetType: "ts" | "js" | "air";
  dry?: boolean;
};

export const compileToFiles = async ({
  compileArgs,
  outputPath,
  targetType,
  dry = false,
}: CompileToFilesArgs): Promise<void> => {
  const isInputPathADirectory = (
    await stat(compileArgs.filePath)
  ).isDirectory();

  const { compileFromPath } = await import("@fluencelabs/aqua-api");

  const compilationResultsWithFilePaths = isInputPathADirectory
    ? await Promise.all(
        (await getAquaFilesRecursively(compileArgs.filePath)).map(
          async (aquaFilePath) => {
            return {
              compilationResult: await compileFromPath({
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
          compilationResult: await compileFromPath(compileArgs),
          aquaFilePath: compileArgs.filePath,
        },
      ];

  if (compilationResultsWithFilePaths.length === 0) {
    return commandObj.error(`No aqua files found at ${compileArgs.filePath}`);
  }

  const resultsWithErrors = compilationResultsWithFilePaths.filter(
    ({ compilationResult }) => {
      return compilationResult.errors.length !== 0;
    },
  );

  if (resultsWithErrors.length !== 0) {
    return commandObj.error(
      resultsWithErrors
        .map(({ compilationResult, aquaFilePath }) => {
          return `${color.yellow(
            aquaFilePath,
          )}\n\n${compilationResult.errors.join("\n")}`;
        })
        .join("\n\n"),
    );
  }

  if (dry) {
    return;
  }

  assert(
    typeof outputPath === "string",
    `outputPath type is "${typeof outputPath}", but it should be of type "string", because it's not dry run`,
  );

  await mkdir(outputPath, { recursive: true });

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
        const finalOutputDirPath = dirPath.replace(inputDirPath, outputPath);

        const sourcesPromise = (async () => {
          return (await aquaToJs(compilationResult, "ts"))?.sources;
        })();

        if (targetType === "ts") {
          return [
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${TS_EXT}`),
              sourcesPromise,
            ),
          ];
        }

        if (targetType === "js") {
          const aquaToJsPromise = aquaToJs(compilationResult, "js");

          const sourcesPromise = (async () => {
            return (await aquaToJsPromise)?.sources;
          })();

          const typesPromise = (async () => {
            return (await aquaToJsPromise)?.types;
          })();

          return [
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.${JS_EXT}`),
              sourcesPromise,
            ),
            writeFileAndMakeSureDirExists(
              join(finalOutputDirPath, `${fileNameWithoutExt}.d.${TS_EXT}`),
              typesPromise,
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
};
