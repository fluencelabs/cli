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

import fsPromises from "node:fs/promises";

import color from "@oclif/color";
import { CliUx } from "@oclif/core";
import camelcase from "camelcase";

import type { AquaCLI } from "./aquaCli";
import type { DeployedServiceConfig, Services } from "./configs/project/app";
import { FS_OPTIONS } from "./const";
import { getDeployedAppAquaPath } from "./pathsGetters/getDefaultAquaPath";
import { getAppJsPath, getJsPath } from "./pathsGetters/getJsPath";
import { getAppTsPath, getTsPath } from "./pathsGetters/getTsPath";

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
      acc[camelcase(name)] = services;
      return acc;
    },
    {}
  );

export const getAppJson = (services: Services): string =>
  JSON.stringify(
    {
      name: APP,
      serviceId: APP,
      functions: [
        {
          name: SERVICE_IDS,
          result: getServicesJsonObj(services),
        },
      ],
    },
    null,
    2
  );

const generateRegisterAppTSorJS = async ({
  deployedServices,
  aquaCli,
  isJS,
}: GenerateRegisterAppOptions & {
  isJS: boolean;
}): Promise<void> => {
  await aquaCli({
    flags: {
      input: getDeployedAppAquaPath(),
      output: isJS ? getJsPath() : getTsPath(),
      js: isJS,
    },
  });

  const appContent =
    // Codegeneration:
    `${isJS ? "" : 'import { FluencePeer } from "@fluencelabs/fluence";'}
import { registerApp as registerAppService } from "./deployed.app";

const service = {
  serviceIds: () => (${JSON.stringify(
    getServicesJsonObj(deployedServices),
    null,
    2
  )}),
};

${
  isJS
    ? "export function registerApp(serviceIdOrPeer, maybeServiceId)"
    : `export function registerApp(): void;
export function registerApp(serviceId: string): void;
export function registerApp(peer: FluencePeer): void;
export function registerApp(peer: FluencePeer, serviceId: string): void;
export function registerApp(
  serviceIdOrPeer?: string | FluencePeer,
  maybeServiceId?: string
): void`
}{

  if (serviceIdOrPeer === undefined) {
    return registerAppService(service);
  }

  if (typeof serviceIdOrPeer === "string") {
    return registerAppService(serviceIdOrPeer, service);
  }

  if (maybeServiceId === undefined) {
    return registerAppService(serviceIdOrPeer, service);
  }

  return registerAppService(serviceIdOrPeer, maybeServiceId, service);
}
`;

  await fsPromises.writeFile(
    isJS ? getAppJsPath() : getAppTsPath(),
    appContent,
    FS_OPTIONS
  );
};

type GenerateRegisterAppOptions = {
  deployedServices: Services;
  aquaCli: AquaCLI;
};

export const generateRegisterApp = async (
  options: GenerateRegisterAppOptions
): Promise<void> => {
  CliUx.ux.action.start(`Compiling ${color.yellow(getDeployedAppAquaPath())}`);
  await generateRegisterAppTSorJS({ ...options, isJS: true });
  await generateRegisterAppTSorJS({ ...options, isJS: false });
  CliUx.ux.action.stop();
};

export const updateDeployedAppAqua = async (
  services: Services
): Promise<void> => {
  const appServicesFilePath = getDeployedAppAquaPath();
  const appServicesAqua =
    // Codegeneration:
    `export App

data ${SERVICE_IDS_ITEM}:
  blueprintId: string
  peerId: string
  serviceId: string

data ${SERVICE_IDS_LIST}:
${Object.keys(getServicesJsonObj(services))
  .map((name): string => `  ${name}: []${SERVICE_IDS_ITEM}\n`)
  .join("")}
service ${APP}("${APP}"):
  ${SERVICE_IDS}: -> ${SERVICE_IDS_LIST}
`;
  await fsPromises.writeFile(appServicesFilePath, appServicesAqua, FS_OPTIONS);
};
