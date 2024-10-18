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
import { relative } from "node:path";
import { cwd } from "node:process";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module.js";
import { ensureServiceConfig } from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MODULE_CONFIG_FULL_FILE_NAME,
  SERVICE_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { isUrl } from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { hasKey } from "../../lib/typeHelpers.js";

const PATH_OR_URL = "PATH | URL";

export default class Add extends BaseCommand<typeof Add> {
  static override description = `Add module to ${SERVICE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    name: Flags.string({
      description: "Override module name",
      helpValue: "<name>",
    }),
    service: Flags.directory({
      description: `Service name from ${FLUENCE_CONFIG_FULL_FILE_NAME} or path to the service config or directory that contains ${SERVICE_CONFIG_FULL_FILE_NAME}`,
      helpValue: "<name | path>",
    }),
  };
  static override args = {
    [PATH_OR_URL]: Args.string({
      description: "Path to a module or url to .tar.gz archive",
    }),
  };
  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Add));

    const modulePathOrUrl =
      args[PATH_OR_URL] ??
      (await input({
        message: "Enter path to a module or url to .tar.gz archive",
      }));

    const moduleConfig = await initReadonlyModuleConfig(modulePathOrUrl, cwd());

    if (moduleConfig === null) {
      return commandObj.error(
        `${color.yellow(
          MODULE_CONFIG_FULL_FILE_NAME,
        )} not found for ${modulePathOrUrl}`,
      );
    }

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

    const validateModuleName = (name: string): true | string => {
      return (
        !(name in serviceConfig.modules) ||
        `You already have ${color.yellow(name)} in ${color.yellow(
          serviceConfig.$getPath(),
        )}`
      );
    };

    let moduleName = flags.name ?? moduleConfig.name;
    const moduleNameValidity = validateModuleName(moduleName);

    if (moduleNameValidity !== true) {
      this.warn(moduleNameValidity);

      moduleName = await input({
        message: `Enter another name for module`,
        validate: validateModuleName,
      });
    }

    serviceConfig.modules = {
      ...serviceConfig.modules,
      [moduleName]: {
        get: isUrl(modulePathOrUrl)
          ? modulePathOrUrl
          : relative(serviceConfig.$getDirPath(), moduleConfig.$getPath()),
      },
    };

    await serviceConfig.$commit();

    commandObj.log(
      `Added ${color.yellow(moduleName)} to ${color.yellow(
        serviceConfig.$getPath(),
      )}`,
    );
  }
}
