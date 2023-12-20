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
import { relative } from "node:path";

import { color } from "@oclif/color";

import { resolveSingleServiceModuleConfigsAndBuild } from "./build.js";
import { commandObj, isInteractive } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { initReadonlyModuleConfig } from "./configs/project/module.js";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
} from "./configs/project/service.js";
import { DEFAULT_DEAL_NAME } from "./const.js";
import {
  AQUA_NAME_REQUIREMENTS,
  getModuleWasmPath,
  validateAquaName,
} from "./helpers/downloadFile.js";
import { updateAquaServiceInterfaceFile } from "./helpers/generateServiceInterface.js";
import type { MarineCLI } from "./marineCli.js";
import { projectRootDir } from "./paths.js";
import { confirm, input } from "./prompt.js";

export async function ensureValidServiceName(
  fluenceConfig: FluenceConfig | null,
  serviceName: string,
) {
  const validateServiceName = createServiceNameValidator(fluenceConfig);
  const serviceNameValidity = validateServiceName(serviceName);

  if (typeof serviceNameValidity === "string") {
    serviceName = await input({
      message: serviceNameValidity,
      validate: validateServiceName,
    });
  }

  return serviceName;
}

function createServiceNameValidator(fluenceConfig: FluenceConfig | null) {
  return function validateServiceName(serviceName: string): true | string {
    if (serviceName in (fluenceConfig?.services ?? {})) {
      return `Service with name ${color.yellow(
        serviceName,
      )} already exists in ${fluenceConfig?.$getPath()}. Please enter another name`;
    }

    const validity = validateAquaName(serviceName);

    if (typeof validity === "string") {
      return validity;
    }

    return true;
  };
}

type AddServiceArg = {
  serviceName: string;
  absolutePathOrUrl: string;
  fluenceConfig: FluenceConfig;
  marineCli: MarineCLI;
  marineBuildArgs?: string | undefined;
  interactive?: boolean;
};

export async function addService({
  serviceName: serviceNameFromArgs,
  absolutePathOrUrl,
  fluenceConfig,
  marineCli,
  marineBuildArgs,
  interactive = true,
}: AddServiceArg): Promise<string> {
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
      !(name in (fluenceConfig.services ?? {})) ||
      `You already have ${color.yellow(name)} in ${color.yellow(
        fluenceConfig.$getPath(),
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
      get: relative(projectRootDir, absolutePathOrUrl),
    },
  };

  const serviceConfig = await initReadonlyServiceConfig(
    absolutePathOrUrl,
    projectRootDir,
  );

  if (serviceConfig === null) {
    return commandObj.error(
      `Service config not found at ${color.yellow(absolutePathOrUrl)}`,
    );
  }

  const facadeModuleConfig = await initReadonlyModuleConfig(
    serviceConfig.modules[FACADE_MODULE_NAME].get,
    serviceConfig.$getDirPath(),
  );

  assert(
    facadeModuleConfig !== null,
    "Unreachable. Facade module is always present in service config",
  );

  await fluenceConfig.$commit();

  if (interactive) {
    commandObj.log(
      `Added ${color.yellow(serviceName)} to ${color.yellow(
        fluenceConfig.$getPath(),
      )}`,
    );
  }

  if (
    hasDefaultDeal(fluenceConfig) &&
    (!interactive ||
      (isInteractive &&
        (await confirm({
          message: `Do you want to add service ${color.yellow(
            serviceName,
          )} to a default deal ${color.yellow(DEFAULT_DEAL_NAME)}`,
        }))))
  ) {
    const defaultDeal = fluenceConfig.deals[DEFAULT_DEAL_NAME];

    fluenceConfig.deals[DEFAULT_DEAL_NAME] = {
      ...defaultDeal,
      services: [...(defaultDeal.services ?? []), serviceName],
    };

    await fluenceConfig.$commit();

    if (interactive) {
      commandObj.log(
        `Added ${color.yellow(serviceName)} to ${color.yellow(
          DEFAULT_DEAL_NAME,
        )}`,
      );
    }
  }

  await resolveSingleServiceModuleConfigsAndBuild(
    serviceConfig,
    fluenceConfig,
    marineCli,
    marineBuildArgs,
  );

  await updateAquaServiceInterfaceFile(
    {
      [serviceName]: getModuleWasmPath(facadeModuleConfig),
    },
    fluenceConfig.services,
    marineCli,
  );

  return serviceName;
}

function hasDefaultDeal(
  fluenceConfig: FluenceConfig,
): fluenceConfig is FluenceConfig & {
  deals: { [DEFAULT_DEAL_NAME]: NonNullable<FluenceConfig["deals"]>[string] };
} {
  return (
    fluenceConfig.deals !== undefined &&
    DEFAULT_DEAL_NAME in fluenceConfig.deals
  );
}
