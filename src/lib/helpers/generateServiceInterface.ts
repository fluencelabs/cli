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
import { readFile, writeFile } from "node:fs/promises";

import type { FluenceConfig } from "../configs/project/fluence.js";
import { FS_OPTIONS, SERVICE_INTERFACE_FILE_HEADER } from "../const.js";
import type { MarineCLI } from "../marineCli.js";
import { ensureFluenceAquaServicesPath } from "../paths.js";

const SERVICE_DEFINITION_SEPARATOR = "\n\n\n";

type GenerateServiceInterfaceArg = {
  serviceId: string;
  pathToFacadeWasm: string;
  marineCli: MarineCLI;
};

const generateAquaInterfaceForService = async ({
  serviceId,
  pathToFacadeWasm,
  marineCli,
}: GenerateServiceInterfaceArg): Promise<string> => {
  const interfaceDeclaration = (
    await marineCli({
      args: ["aqua", pathToFacadeWasm],
      flags: { service: serviceId, id: serviceId },
      printOutput: false,
    })
  )
    .split("declares *")[1]
    ?.trim();

  assert(
    interfaceDeclaration !== undefined,
    `Failed to generate service interface for ${pathToFacadeWasm}`,
  );

  return interfaceDeclaration;
};

const getServiceIdFromServiceInterface = (dataAndServiceDefinition: string) => {
  const dataAndServiceDefinitionAr = dataAndServiceDefinition.split("\n\n");
  const serviceDefinition = dataAndServiceDefinitionAr.pop();

  assert(
    serviceDefinition !== undefined &&
      serviceDefinition.trim().startsWith("service"),
    `Failed to parse service definition from ${dataAndServiceDefinition}`,
  );

  const serviceId = serviceDefinition.split('"')[1];

  assert(
    serviceId !== undefined,
    `Failed to parse service id from service definition: ${dataAndServiceDefinition}`,
  );

  return serviceId;
};

const getServiceInterfaceFileContent = (serviceInterfaces: string[]) => {
  return (
    [SERVICE_INTERFACE_FILE_HEADER, ...serviceInterfaces].join(
      SERVICE_DEFINITION_SEPARATOR,
    ) + "\n"
  );
};

export const updateAquaServiceInterfaceFile = async (
  serviceNamePathToFacadeMap: Record<string, string>,
  servicesFromFluenceConfig: FluenceConfig["services"],
  marineCli: MarineCLI,
) => {
  let previouslyGeneratedInterfacesStr = "";

  try {
    previouslyGeneratedInterfacesStr = await readFile(
      await ensureFluenceAquaServicesPath(),
      FS_OPTIONS,
    );
  } catch {}

  const previouslyGeneratedInterfaces = previouslyGeneratedInterfacesStr
    .trim()
    .split(SERVICE_DEFINITION_SEPARATOR)
    .map((serviceDefinition) => {
      return serviceDefinition.trim();
    })
    .filter((serviceDefinition) => {
      return (
        serviceDefinition !== "" &&
        serviceDefinition !== SERVICE_INTERFACE_FILE_HEADER
      );
    });

  const serviceNamesFromFluenceConfig = new Set(
    Object.keys(servicesFromFluenceConfig ?? {}),
  );

  const previouslyGeneratedInterfacesWithIdsPresentInFluenceConfig =
    previouslyGeneratedInterfaces
      .map((serviceDefinition) => {
        return {
          serviceId: getServiceIdFromServiceInterface(serviceDefinition),
          serviceDefinition,
        };
      })
      .filter(({ serviceId }) => {
        return serviceNamesFromFluenceConfig.has(serviceId);
      });

  const serviceIdsFromPreviouslyGeneratedInterfaces = new Set(
    previouslyGeneratedInterfacesWithIdsPresentInFluenceConfig.map(
      ({ serviceId }) => {
        return serviceId;
      },
    ),
  );

  const generatedServiceInterfaceMap = Object.fromEntries(
    await Promise.all(
      Object.entries(serviceNamePathToFacadeMap).map(
        async ([serviceId, pathToFacadeWasm]) => {
          return [
            serviceId,
            await generateAquaInterfaceForService({
              serviceId,
              pathToFacadeWasm,
              marineCli,
            }),
          ] as const;
        },
      ),
    ),
  );

  const newServiceInterfaces = Object.entries(generatedServiceInterfaceMap)
    .filter(([serviceId]) => {
      return !serviceIdsFromPreviouslyGeneratedInterfaces.has(serviceId);
    })
    .map(([, serviceDefinition]) => {
      return serviceDefinition;
    });

  const serviceInterfacesToWrite =
    previouslyGeneratedInterfacesWithIdsPresentInFluenceConfig
      .map(({ serviceId, serviceDefinition }) => {
        return generatedServiceInterfaceMap[serviceId] ?? serviceDefinition;
      })
      .concat(newServiceInterfaces);

  await writeFile(
    await ensureFluenceAquaServicesPath(),
    getServiceInterfaceFileContent(serviceInterfacesToWrite),
    FS_OPTIONS,
  );
};
