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
import { mkdir, readdir, stat, unlink, writeFile } from "node:fs/promises";
import { extname, join, parse } from "node:path";

import {
  AquaConfig,
  CompilationResult,
  Aqua,
  Call,
  Input,
  Path,
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
    }[targetType]
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
  const res = (await stat(compileArgs.filePath)).isDirectory()
    ? await Promise.all(
        (
          await readdir(compileArgs.filePath)
        )
          .map((fileName) => {
            return join(compileArgs.filePath, fileName);
          })
          .filter((filePath) => {
            return extname(filePath).toLowerCase() === ".aqua";
          })
          .map(async (filePath) => {
            return [
              await compile({ ...compileArgs, filePath }),
              filePath,
            ] as const;
          })
      )
    : [[await compile(compileArgs), compileArgs.filePath] as const];

  const resultsWithErrors = res.filter(([r]) => {
    return r.errors.length !== 0;
  });

  if (resultsWithErrors.length !== 0) {
    return commandObj.error(
      resultsWithErrors
        .map(([r, filePath]) => {
          return `${color.yellow(filePath)}\n\n${r.errors.join("\n")}`;
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

  try {
    await unlink(outputPath);
  } catch {}

  await mkdir(outputPath, { recursive: true });

  if (compileArgs.targetType === "ts") {
    await Promise.all(
      res.map(([r]) => {
        const generatedSource = r.generatedSources[0];

        assert(
          generatedSource !== undefined,
          "generatedSource must be defined"
        );

        const { name, tsSource } = generatedSource;
        assert(typeof tsSource === "string", "tsSource must be a string");

        const parsedPath = parse(name);
        const fileNameWithoutExt = parsedPath.name;

        return writeFile(
          join(outputPath, `${fileNameWithoutExt}.${TS_EXT}`),
          tsSource,
          FS_OPTIONS
        );
      })
    );

    return;
  }

  if (compileArgs.targetType === "js") {
    await Promise.all(
      res.map(async ([r]) => {
        const generatedSource = r.generatedSources[0];

        assert(
          generatedSource !== undefined,
          "generatedSource must be defined"
        );

        const { name, jsSource, tsTypes } = generatedSource;
        assert(typeof jsSource === "string", "jsSource must be a string");
        assert(typeof tsTypes === "string", "tsTypes must be a string");

        const parsedPath = parse(name);
        const fileNameWithoutExt = parsedPath.name;

        await writeFile(
          join(outputPath, `${fileNameWithoutExt}.${JS_EXT}`),
          jsSource,
          FS_OPTIONS
        );

        await writeFile(
          join(outputPath, `${fileNameWithoutExt}.d.${TS_EXT}`),
          tsTypes,
          FS_OPTIONS
        );
      })
    );

    return;
  }

  await Promise.all(
    res.flatMap(([r, filePath]) => {
      const parsedPath = parse(filePath);
      const fileNameWithoutExt = parsedPath.name;

      return Object.entries(r.functions).map(([name, { script }]) => {
        return writeFile(
          join(outputPath, `${fileNameWithoutExt}.${name}.air`),
          script,
          FS_OPTIONS
        );
      });
    })
  );
};
