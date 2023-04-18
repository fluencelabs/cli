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
import { cwd } from "node:process";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  FACADE_MODULE_NAME,
  initServiceConfig,
  type ServiceConfigReadonly,
} from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const.js";
import {
  getModuleAbsolutePath,
  isUrl,
} from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { hasKey } from "../../lib/typeHelpers.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove module from ${SERVICE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    service: Flags.directory({
      description: `Service name from ${FLUENCE_CONFIG_FILE_NAME} or path to the service directory`,
      helpValue: "<name | path>",
    }),
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Module name from ${SERVICE_CONFIG_FILE_NAME}, path to a module or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Remove)
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await input({
        message: `Enter module name from ${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )}, path to a module or url to .tar.gz archive`,
      }));

    const serviceNameOrPath =
      flags.service ??
      (await input({
        message: `Enter service name from ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )} or path to the service directory`,
      }));

    let serviceOrServiceDirPathOrUrl = serviceNameOrPath;

    if (hasKey(serviceNameOrPath, maybeFluenceConfig?.services)) {
      const serviceGet = maybeFluenceConfig?.services[serviceNameOrPath]?.get;
      assert(typeof serviceGet === "string");
      serviceOrServiceDirPathOrUrl = serviceGet;
    }

    if (isUrl(serviceOrServiceDirPathOrUrl)) {
      return commandObj.error(
        `Can't modify downloaded service ${color.yellow(
          serviceOrServiceDirPathOrUrl
        )}`
      );
    }

    const serviceConfig = await initServiceConfig(
      serviceOrServiceDirPathOrUrl,
      cwd()
    );

    if (serviceConfig === null) {
      return commandObj.error(
        `Can't find service config at ${color.yellow(
          serviceOrServiceDirPathOrUrl
        )}`
      );
    }

    if (nameOrPathOrUrl === FACADE_MODULE_NAME) {
      return commandObj.error(
        `Each service must have a facade module, if you want to change it either override it in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )} or replace it manually in ${serviceConfig.$getPath()}`
      );
    }

    const moduleNameToRemove = await getModuleNameToRemove(
      nameOrPathOrUrl,
      serviceConfig
    );

    delete serviceConfig.modules[moduleNameToRemove];
    await serviceConfig.$commit();

    commandObj.log(
      `Removed module ${color.yellow(nameOrPathOrUrl)} from ${color.yellow(
        serviceConfig.$getPath()
      )}`
    );
  }
}

const getModuleNameToRemove = async (
  nameOrPathOrUrl: string,
  serviceConfig: ServiceConfigReadonly
): Promise<string> => {
  if (nameOrPathOrUrl in serviceConfig.modules) {
    return nameOrPathOrUrl;
  }

  const serviceModulesAbsolutePathsWithNames = await Promise.all(
    Object.entries(serviceConfig.modules).map(async ([name, { get }]) => {
      return [
        name,
        await getModuleAbsolutePath(get, serviceConfig.$getDirPath()),
      ] as const;
    })
  );

  const absolutePathRelativeToService = await getModuleAbsolutePath(
    nameOrPathOrUrl,
    serviceConfig.$getDirPath()
  );

  let [moduleNameToRemove] =
    serviceModulesAbsolutePathsWithNames.find(([, absolutePath]) => {
      return absolutePath === absolutePathRelativeToService;
    }) ?? [];

  if (moduleNameToRemove !== undefined) {
    return moduleNameToRemove;
  }

  const absolutePathRelativeToCwd = await getModuleAbsolutePath(
    nameOrPathOrUrl,
    cwd()
  );

  [moduleNameToRemove] =
    serviceModulesAbsolutePathsWithNames.find(([, absolutePath]) => {
      return absolutePath === absolutePathRelativeToCwd;
    }) ?? [];

  if (moduleNameToRemove !== undefined) {
    return moduleNameToRemove;
  }

  return commandObj.error(
    `There is no module ${color.yellow(nameOrPathOrUrl)} in ${color.yellow(
      serviceConfig.$getPath()
    )}`
  );
};
