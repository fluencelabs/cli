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
import path from "node:path";

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";

import type { FluenceConfig } from "../../lib/configs/project/fluence";
import { initFluenceLockConfig } from "../../lib/configs/project/fluenceLock";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
} from "../../lib/configs/project/service";
import {
  CommandObj,
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  NAME_FLAG_NAME,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import {
  AQUA_NAME_REQUIREMENTS,
  downloadModule,
  downloadService,
  getModuleWasmPath,
  isUrl,
  validateAquaName,
} from "../../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { generateServiceInterface } from "../../lib/helpers/generateServiceInterface";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { initMarineCli } from "../../lib/marineCli";
import { input } from "../../lib/prompt";

const PATH_OR_URL = "PATH | URL";

export default class Add extends Command {
  static override description = `Add service to ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    [NAME_FLAG_NAME]: Flags.string({
      description: `Override service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
  };
  static override args = [
    {
      name: PATH_OR_URL,
      description: "Path to a service or url to .tar.gz archive",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Add);
    const isInteractive = getIsInteractive(flags);
    const fluenceConfig = await ensureFluenceProject(this, isInteractive);

    const servicePathOrUrl: unknown =
      args[PATH_OR_URL] ??
      (await input({ isInteractive, message: "Enter service path or url" }));

    assert(typeof servicePathOrUrl === "string");

    const servicePath = isUrl(servicePathOrUrl)
      ? await downloadService(servicePathOrUrl)
      : servicePathOrUrl;

    const serviceConfig = await initReadonlyServiceConfig(servicePath, this);

    if (serviceConfig === null) {
      this.error(
        `${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )} not found for ${servicePathOrUrl}`
      );
    }

    const serviceName = await addService({
      commandObj: this,
      serviceName: flags[NAME_FLAG_NAME] ?? serviceConfig.name,
      pathOrUrl: servicePathOrUrl,
      isInteractive,
      fluenceConfig,
    });

    const facadeModuleGet = serviceConfig.modules[FACADE_MODULE_NAME].get;

    const facadeModulePath = isUrl(facadeModuleGet)
      ? await downloadModule(facadeModuleGet)
      : path.resolve(servicePath, facadeModuleGet);

    const facadeReadonlyConfig = await initReadonlyModuleConfig(
      facadeModulePath,
      this
    );

    if (facadeReadonlyConfig === null) {
      this.error(`Facade module not found at ${facadeModulePath}`);
    }

    const maybeFluenceLockConfig = await initFluenceLockConfig(this);

    const marineCli = await initMarineCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    await generateServiceInterface({
      pathToFacadeWasm: getModuleWasmPath(facadeReadonlyConfig),
      marineCli,
      serviceName,
    });
  }
}

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
