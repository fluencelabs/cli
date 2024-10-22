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
import { readFile, writeFile } from "node:fs/promises";

import { initFluenceConfig } from "../configs/project/fluence.js";
import { FS_OPTIONS, SERVICE_INTERFACE_FILE_HEADER } from "../const.js";
import type { MarineCLI } from "../marineCli.js";
import { ensureFluenceAquaServicesPath } from "../paths.js";

const SERVICE_DEFINITION_SEPARATOR = "\n\n\n";
const SERVICE_AND_DATA_DEFINITION_SEPARATOR = "\n\n";

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
  const dataAndServiceDefinitionAr = dataAndServiceDefinition.split(
    SERVICE_AND_DATA_DEFINITION_SEPARATOR,
  );

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

function getServiceInterfaceFileContent(serviceInterfaces: string[]) {
  const definitions = new Set<string>();

  const deduplicatedDefinitions = serviceInterfaces.map((s) => {
    return s
      .split(SERVICE_AND_DATA_DEFINITION_SEPARATOR)
      .filter((d) => {
        if (definitions.has(d)) {
          return false;
        }

        definitions.add(d);
        return true;
      })
      .join(SERVICE_AND_DATA_DEFINITION_SEPARATOR);
  });

  return (
    [SERVICE_INTERFACE_FILE_HEADER, ...deduplicatedDefinitions].join(
      SERVICE_DEFINITION_SEPARATOR,
    ) + "\n"
  );
}

export const updateAquaServiceInterfaceFile = async (
  serviceNamePathToFacadeMap: Record<string, string>,
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
    Object.keys((await initFluenceConfig())?.services ?? {}),
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
