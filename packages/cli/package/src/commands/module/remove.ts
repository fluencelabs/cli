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
import { cwd } from "node:process";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { isValidServiceModules } from "../../lib/configs/project/service.js";
import {
  ensureServiceConfig,
  type ServiceConfigReadonly,
} from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  SERVICE_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import {
  getModuleAbsolutePath,
  isUrl,
} from "../../lib/helpers/downloadFile.js";
import { removeProperties } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { hasKey } from "../../lib/typeHelpers.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove module from ${SERVICE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    service: Flags.directory({
      description: `Service name from ${FLUENCE_CONFIG_FULL_FILE_NAME} or path to the service directory`,
      helpValue: "<name | path>",
    }),
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Module name from ${SERVICE_CONFIG_FULL_FILE_NAME}, path to a module or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Remove));
    const fluenceConfig = await initFluenceConfig();

    const serviceNameOrPath =
      flags.service ??
      (await input({
        message:
          fluenceConfig === null
            ? `Enter path to the service directory`
            : `Enter service name from ${color.yellow(
                fluenceConfig.$getPath(),
              )} or path to the service directory`,
      }));

    let serviceOrServiceDirPathOrUrl = serviceNameOrPath;

    if (hasKey(serviceNameOrPath, fluenceConfig?.services)) {
      const serviceGet = fluenceConfig.services[serviceNameOrPath]?.get;
      assert(typeof serviceGet === "string");
      serviceOrServiceDirPathOrUrl = serviceGet;
    }

    if (isUrl(serviceOrServiceDirPathOrUrl)) {
      return commandObj.error(
        `Can't modify downloaded service ${color.yellow(
          serviceOrServiceDirPathOrUrl,
        )}`,
      );
    }

    const serviceConfig = await ensureServiceConfig(
      serviceOrServiceDirPathOrUrl,
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await input({
        message: `Enter module name from ${color.yellow(
          serviceConfig.$getPath(),
        )}, path to a module or url to .tar.gz archive`,
      }));

    const moduleNameToRemove = await getModuleNameToRemove(
      nameOrPathOrUrl,
      serviceConfig,
    );

    const newModules = removeProperties(serviceConfig.modules, ([name]) => {
      return name === moduleNameToRemove;
    });

    if (!isValidServiceModules(newModules)) {
      return commandObj.error(
        `Each service must have a facade module, if you want to change it either override it in ${color.yellow(
          FLUENCE_CONFIG_FULL_FILE_NAME,
        )} or replace it manually in ${serviceConfig.$getPath()}`,
      );
    }

    serviceConfig.modules = newModules;
    await serviceConfig.$commit();

    commandObj.log(
      `Removed module ${color.yellow(nameOrPathOrUrl)} from ${color.yellow(
        serviceConfig.$getPath(),
      )}`,
    );
  }
}

const getModuleNameToRemove = async (
  nameOrPathOrUrl: string,
  serviceConfig: ServiceConfigReadonly,
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
    }),
  );

  const absolutePathRelativeToService = await getModuleAbsolutePath(
    nameOrPathOrUrl,
    serviceConfig.$getDirPath(),
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
    cwd(),
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
      serviceConfig.$getPath(),
    )}`,
  );
};
