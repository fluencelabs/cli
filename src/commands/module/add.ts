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
import path from "node:path";
import { cwd } from "node:process";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module.js";
import { initServiceConfig } from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MODULE_CONFIG_FULL_FILE_NAME,
  SERVICE_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { isUrl } from "../../lib/helpers/downloadFile.js";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir.js";
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
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Add)
    );

    const modulePathOrUrl =
      args[PATH_OR_URL] ??
      (await input({
        message: "Enter path to a module or url to .tar.gz archive",
      }));

    const moduleConfig = await initReadonlyModuleConfig(modulePathOrUrl, cwd());

    if (moduleConfig === null) {
      return commandObj.error(
        `${color.yellow(
          MODULE_CONFIG_FULL_FILE_NAME
        )} not found for ${modulePathOrUrl}`
      );
    }

    const serviceNameOrPath =
      flags.service ??
      (await input({
        message:
          maybeFluenceConfig === null
            ? `Enter path to the service directory`
            : `Enter service name from ${color.yellow(
                maybeFluenceConfig.$getPath()
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

    const validateModuleName = (name: string): true | string => {
      return (
        !(name in serviceConfig.modules) ||
        `You already have ${color.yellow(name)} in ${color.yellow(
          serviceConfig.$getPath()
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
          : path.relative(serviceConfig.$getDirPath(), moduleConfig.$getPath()),
      },
    };

    await serviceConfig.$commit();

    this.log(
      `Added ${color.yellow(moduleName)} to ${color.yellow(
        replaceHomeDir(serviceConfig.$getPath())
      )}`
    );
  }
}
