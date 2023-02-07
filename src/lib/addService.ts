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

import path from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { buildModule } from "./build.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import {
  FACADE_MODULE_NAME,
  ServiceConfigReadonly,
} from "./configs/project/service.js";
import { DEFAULT_DEPLOY_NAME, FLUENCE_CONFIG_FILE_NAME } from "./const.js";
import {
  AQUA_NAME_REQUIREMENTS,
  getModuleWasmPath,
  validateAquaName,
} from "./helpers/downloadFile.js";
import { generateServiceInterface } from "./helpers/generateServiceInterface.js";
import { commandObj } from "./lifecyle.js";
import type { MarineCLI } from "./marineCli.js";
import { input } from "./prompt.js";

type AddServiceArg = {
  serviceName: string;
  pathOrUrl: string;
  fluenceConfig: FluenceConfig;
  serviceConfig: ServiceConfigReadonly;
  marineCli: MarineCLI;
};

export const addService = async ({
  serviceName: serviceNameFromArgs,
  pathOrUrl,
  fluenceConfig,
  serviceConfig,
  marineCli,
}: AddServiceArg): Promise<string> => {
  let serviceName = serviceNameFromArgs;

  if (fluenceConfig.services === undefined) {
    fluenceConfig.services = {};
  }

  const validateServiceName = (name: string): true | string => {
    const aquaNameValidity = validateAquaName(name);

    if (typeof aquaNameValidity === "string") {
      return aquaNameValidity;
    }

    return (
      !(name in (fluenceConfig?.services ?? {})) ||
      `You already have ${color.yellow(name)} in ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}`
    );
  };

  const serviceNameValidity = validateServiceName(serviceName);

  if (serviceNameValidity !== true) {
    commandObj.warn(serviceNameValidity);

    serviceName = await input({
      message: `Enter another name for the service (${AQUA_NAME_REQUIREMENTS})`,
      validate: validateServiceName,
    });
  }

  fluenceConfig.services = {
    ...fluenceConfig.services,
    [serviceName]: {
      get: pathOrUrl,
      deploy: [
        {
          deployId: DEFAULT_DEPLOY_NAME,
        },
      ],
    },
  };

  const moduleConfigs = await Promise.all(
    Object.entries(serviceConfig.modules).map(([name, { get }]) =>
      (async () => {
        const moduleConfig = await buildModule({
          get,
          marineCli,
          serviceDirPath: path.dirname(serviceConfig.$getPath()),
        });

        return [name, moduleConfig] as const;
      })()
    )
  );

  const maybeFacadeReadonlyConfig = moduleConfigs.find(
    ([name]) => name === FACADE_MODULE_NAME
  )?.[1];

  if (maybeFacadeReadonlyConfig === undefined) {
    throw new Error("Unreachable. Facade module config not found");
  }

  const facadeReadonlyConfig = maybeFacadeReadonlyConfig;

  await generateServiceInterface({
    pathToFacadeWasm: getModuleWasmPath(facadeReadonlyConfig),
    marineCli,
    serviceName,
  });

  await fluenceConfig.$commit();

  commandObj.log(
    `Added ${color.yellow(serviceName)} to ${color.yellow(
      FLUENCE_CONFIG_FILE_NAME
    )}`
  );

  return serviceName;
};
