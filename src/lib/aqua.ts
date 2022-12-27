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

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import assert from "node:assert";

import api from "@fluencelabs/aqua-api/aqua-api";
import type { callFunctionImpl } from "@fluencelabs/fluence/dist/internal/compilerSupport/v3impl/callFunction";

export type Data = Parameters<typeof callFunctionImpl>[4];

type CommonArgs = {
  aquaImports: string[];
  constants: string[] | undefined;
  logLevelCompiler: string | undefined;
  noRelay?: boolean;
  noXor?: boolean;
};

export async function compile(
  arg: { code: string } & CommonArgs
): ReturnType<typeof api.Aqua.compileString>;
export async function compile(
  arg: { absoluteAquaFilePath: string } & CommonArgs
): ReturnType<typeof api.Aqua.compile>;
export async function compile(
  arg: {
    absoluteAquaFilePath: string;
    funcCallStr: string;
    data: Data | undefined;
  } & CommonArgs
): ReturnType<typeof api.Aqua.compileRun>;

export async function compile({
  funcCallStr,
  code,
  absoluteAquaFilePath,
  aquaImports,
  data = {},
  constants = [],
  logLevelCompiler = "info",
  noRelay = false,
  noXor = false,
}: {
  code?: string;
  absoluteAquaFilePath?: string;
  funcCallStr?: string;
  data?: Data | undefined;
} & CommonArgs) {
  const config = new api.AquaConfig(
    logLevelCompiler,
    constants,
    noXor,
    noRelay
  );

  if (
    typeof funcCallStr === "string" &&
    typeof absoluteAquaFilePath !== "undefined"
  ) {
    return api.Aqua.compileRun(
      funcCallStr,
      data,
      absoluteAquaFilePath,
      aquaImports,
      config
    );
  }

  if (typeof code === "string") {
    return api.Aqua.compileString(code, aquaImports, config);
  }

  assert(typeof absoluteAquaFilePath === "string");
  return api.Aqua.compile(absoluteAquaFilePath, aquaImports, config);
}
