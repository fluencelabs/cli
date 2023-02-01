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
import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module";
import { initServiceConfig } from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  MODULE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import { getModuleAbsolutePath, isUrl } from "../../lib/helpers/downloadFile";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir";
import { initCli } from "../../lib/lifecyle";
import { input } from "../../lib/prompt";
import { hasKey } from "../../lib/typeHelpers";

const PATH_OR_URL = "PATH | URL";

export default class Add extends BaseCommand<typeof Add> {
  static override description = `Add module to ${SERVICE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    name: Flags.string({
      description: "Override module name",
      helpValue: "<name>",
    }),
    service: Flags.directory({
      description: `Service name from ${FLUENCE_CONFIG_FILE_NAME} or path to the service directory`,
      helpValue: "<name | path>",
    }),
  };
  static override args = {
    [PATH_OR_URL]: Args.string({
      description: "Path to a module or url to .tar.gz archive",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, isInteractive, maybeFluenceConfig, commandObj } =
      await initCli(this, await this.parse(Add));

    const modulePathOrUrl =
      args[PATH_OR_URL] ??
      (await input({
        isInteractive,
        message: "Enter path to a module or url to .tar.gz archive",
      }));

    const modulePath = await getModuleAbsolutePath(modulePathOrUrl);
    const moduleConfig = await initReadonlyModuleConfig(modulePath, commandObj);

    if (moduleConfig === null) {
      return commandObj.error(
        `${color.yellow(
          MODULE_CONFIG_FILE_NAME
        )} not found for ${modulePathOrUrl}`
      );
    }

    const serviceNameOrPath =
      flags.service ??
      (await input({
        isInteractive,
        message: `Enter service name from ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )} or path to the service directory`,
      }));

    let serviceDirPath = serviceNameOrPath;

    if (hasKey(serviceNameOrPath, maybeFluenceConfig?.services)) {
      const serviceGet = maybeFluenceConfig?.services[serviceNameOrPath]?.get;
      assert(typeof serviceGet === "string");
      serviceDirPath = serviceGet;
    }

    if (isUrl(serviceDirPath)) {
      return commandObj.error(
        `Can't modify downloaded service ${color.yellow(serviceDirPath)}`
      );
    }

    serviceDirPath = path.resolve(serviceDirPath);

    const serviceConfig = await initServiceConfig(serviceDirPath, commandObj);

    if (serviceConfig === null) {
      return commandObj.error(
        `Directory ${color.yellow(
          serviceDirPath
        )} does not contain ${color.yellow(SERVICE_CONFIG_FILE_NAME)}`
      );
    }

    const validateModuleName = (name: string): true | string =>
      !(name in serviceConfig.modules) ||
      `You already have ${color.yellow(name)} in ${color.yellow(
        serviceConfig.$getPath()
      )}`;

    let moduleName = flags.name ?? moduleConfig.name;
    const moduleNameValidity = validateModuleName(moduleName);

    if (moduleNameValidity !== true) {
      this.warn(moduleNameValidity);

      moduleName = await input({
        isInteractive,
        message: `Enter another name for module`,
        validate: validateModuleName,
      });
    }

    serviceConfig.modules = {
      ...serviceConfig.modules,
      [moduleName]: {
        get: isUrl(modulePathOrUrl)
          ? modulePathOrUrl
          : path.relative(serviceDirPath, modulePath),
      },
    };

    await serviceConfig.$commit();

    this.log(
      `Added ${color.yellow(moduleName)} to ${color.yellow(
        replaceHomeDir(serviceDirPath)
      )}`
    );
  }
}
