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

import type { MarineCLI } from "../marineCli.js";

const SERVICE = "service ";

type GenerateServiceInterfaceArg = {
  serviceId: string;
  pathToFacadeWasm: string;
  marineCli: MarineCLI;
};

export const generateAquaInterfaceForService = async ({
  serviceId,
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
    `Failed to generate service interface for ${pathToFacadeWasm}`,
  );

  const declarations = interfaceDeclaration.split(SERVICE);
  const [serviceName, ...rest] = declarations.pop()?.split(":") ?? [];

  if (serviceName === undefined || rest.length === 0) {
    throw new Error(
      `Failed to generate service interface for ${pathToFacadeWasm}`,
    );
  }

  declarations.push(`${serviceName}("${serviceId}"):${rest.join(":")}`);
  return declarations.join(SERVICE);
};
