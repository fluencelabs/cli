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

import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { build } from "./build.js";
import { commandObj, isInteractive } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { DEFAULT_WORKER_NAME, FLUENCE_CONFIG_FILE_NAME } from "./const.js";
import {
  AQUA_NAME_REQUIREMENTS,
  validateAquaName,
} from "./helpers/downloadFile.js";
import { getExistingKeyPair } from "./keyPairs.js";
import type { MarineCLI } from "./marineCli.js";
import { confirm, input } from "./prompt.js";

type AddServiceArg = {
  serviceName: string;
  pathOrUrl: string;
  fluenceConfig: FluenceConfig;
  marineCli: MarineCLI;
  interactive?: boolean;
};

export const addService = async ({
  serviceName: serviceNameFromArgs,
  pathOrUrl,
  fluenceConfig,
  marineCli,
  interactive = true,
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
    },
  };

  const defaultKeyPair = await getExistingKeyPair(fluenceConfig.keyPairName);

  if (defaultKeyPair instanceof Error) {
    commandObj.error(defaultKeyPair.message);
  }

  await build({ marineCli, fluenceConfig, defaultKeyPair });
  await fluenceConfig.$commit();

  if (interactive) {
    commandObj.log(
      `Added ${color.yellow(serviceName)} to ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}`
    );
  }

  if (
    !(
      isInteractive &&
      fluenceConfig !== undefined &&
      fluenceConfig.workers !== undefined &&
      DEFAULT_WORKER_NAME in fluenceConfig.workers &&
      !(fluenceConfig.workers[DEFAULT_WORKER_NAME]?.services ?? []).includes(
        serviceName
      ) &&
      (interactive
        ? await confirm({
            message: `Do you want to add service ${color.yellow(
              serviceName
            )} to a default worker ${color.yellow(DEFAULT_WORKER_NAME)}`,
          })
        : true)
    )
  ) {
    return serviceName;
  }

  const defaultWorker = fluenceConfig.workers[DEFAULT_WORKER_NAME];
  assert(defaultWorker !== undefined);

  fluenceConfig.workers[DEFAULT_WORKER_NAME] = {
    ...defaultWorker,
    services: [...(defaultWorker.services ?? []), serviceName],
  };

  await fluenceConfig.$commit();

  if (interactive) {
    commandObj.log(
      `Added ${color.yellow(serviceName)} to ${color.yellow(
        DEFAULT_WORKER_NAME
      )}`
    );
  }

  return serviceName;
};
