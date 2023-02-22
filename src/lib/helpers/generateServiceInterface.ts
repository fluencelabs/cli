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

import assert from "node:assert";

import camelcase from "camelcase";

import type { MarineCLI } from "../marineCli.js";

type GenerateServiceInterfaceArg = {
  pathToFacadeWasm: string;
  marineCli: MarineCLI;
};

export const generateServiceInterface = async ({
  pathToFacadeWasm,
  marineCli,
}: GenerateServiceInterfaceArg): Promise<string> => {
  const interfaceDeclaration = (
    await marineCli({
      args: ["aqua", pathToFacadeWasm],
      printOutput: false,
    })
  )
    .split("declares *")[1]
    ?.trim();

  assert(
    interfaceDeclaration !== undefined,
    `Failed to generate service interface for ${pathToFacadeWasm}`
  );

  const [start, ...end] = interfaceDeclaration.split(":");
  const serviceName = camelcase(start?.slice("service ".length).trim() ?? "");

  return `${start ?? ""}("${serviceName}"):${end.join(":")}`;
};
