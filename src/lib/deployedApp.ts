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
import fsPromises from "node:fs/promises";

import camelcase from "camelcase";

import type { DeployedServiceConfig, Services } from "./configs/project/app";
import { FS_OPTIONS } from "./const";
import { getDeployedAppAquaPath } from "./pathsGetters/getDefaultAquaPath";

const APP = "App";
const SERVICE_IDS = "serviceIds";
const SERVICE_IDS_ITEM = "ServiceIdsItem";
const SERVICE_IDS_LIST = "ServiceIdsList";

type ServiceJsonObj = Record<
  string,
  DeployedServiceConfig | Array<DeployedServiceConfig>
>;

const getServicesJsonObj = (services: Services): ServiceJsonObj =>
  Object.entries(services).reduce<ServiceJsonObj>(
    (acc, [name, services]): ServiceJsonObj => {
      const firstService = services[0];
      assert(firstService !== undefined);
      acc[camelcase(name)] = firstService;
      if (services.length > 1) {
        acc[`${camelcase(name)}Services`] = services;
      }
      return acc;
    },
    {}
  );

export const getAppJson = (services: Services): string =>
  JSON.stringify({
    name: APP,
    serviceId: APP,
    functions: [
      {
        name: SERVICE_IDS,
        result: getServicesJsonObj(services),
      },
    ],
  });

export const updateDeployedAppAqua = async (
  services: Services
): Promise<void> => {
  const appServicesFilePath = getDeployedAppAquaPath();
  const appServicesAqua = `data ${SERVICE_IDS_ITEM}:
  blueprintId: string
  peerId: string
  serviceId: string

data ${SERVICE_IDS_LIST}:
${Object.entries(getServicesJsonObj(services))
  .map(
    ([name, serviceOrServices]): string =>
      `  ${name}: ${
        Array.isArray(serviceOrServices) ? "[]" : ""
      }${SERVICE_IDS_ITEM}\n`
  )
  .join("")}
service ${APP}("${APP}"):
  ${SERVICE_IDS}: -> ${SERVICE_IDS_LIST}
`;
  await fsPromises.writeFile(appServicesFilePath, appServicesAqua, FS_OPTIONS);
};
