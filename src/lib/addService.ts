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

import color from "@oclif/color";

import type { FluenceConfig } from "./configs/project/fluence";
import {
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
} from "./const";
import {
  AQUA_NAME_REQUIREMENTS,
  validateAquaName,
} from "./helpers/downloadFile";
import { input } from "./prompt";

type AddServiceArg = {
  commandObj: CommandObj;
  serviceName: string;
  pathOrUrl: string;
  isInteractive: boolean;
  fluenceConfig: FluenceConfig;
};

export const addService = async ({
  commandObj,
  serviceName,
  pathOrUrl,
  isInteractive,
  fluenceConfig,
}: AddServiceArg): Promise<string> => {
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

  let validServiceName = serviceName;
  const serviceNameValidity = validateServiceName(validServiceName);

  if (serviceNameValidity !== true) {
    commandObj.warn(serviceNameValidity);

    validServiceName = await input({
      isInteractive,
      message: `Enter another name for the service (${AQUA_NAME_REQUIREMENTS})`,
      validate: validateServiceName,
    });
  }

  fluenceConfig.services = {
    ...fluenceConfig.services,
    [validServiceName]: {
      get: pathOrUrl,
      deploy: [
        {
          deployId: DEFAULT_DEPLOY_NAME,
        },
      ],
    },
  };

  await fluenceConfig.$commit();

  commandObj.log(
    `Added ${color.yellow(serviceName)} to ${color.yellow(
      FLUENCE_CONFIG_FILE_NAME
    )}`
  );

  return validServiceName;
};
