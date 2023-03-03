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

import {
  AquaConfig,
  CompilationResult,
  Aqua,
  Call,
  Input,
  Path,
} from "@fluencelabs/aqua-api/aqua-api.js";
import type { callFunctionImpl } from "@fluencelabs/fluence/dist/internal/compilerSupport/v3impl/callFunction.js";

export type Data = Parameters<typeof callFunctionImpl>[4];

type CommonArgs = {
  imports?: string[] | undefined;
  constants?: string[] | undefined;
  logLevel?: string | undefined;
  noRelay?: boolean | undefined;
  noXor?: boolean | undefined;
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
    data?: Data | undefined;
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
}: {
  code?: string;
  filePath?: string;
  funcCall?: string;
  data?: Data | undefined;
} & CommonArgs): Promise<CompilationResult> {
  const config = new AquaConfig(logLevel, constants, noXor, noRelay);

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
