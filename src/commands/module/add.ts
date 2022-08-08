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

import { initFluenceConfig } from "../../lib/configs/project/fluence";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module";
import { initServiceConfig } from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  MODULE_CONFIG_FILE_NAME,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import { downloadModule, isUrl } from "../../lib/helpers/downloadFile";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir";
import { input } from "../../lib/prompt";
import { hasKey } from "../../lib/typeHelpers";

const PATH_OR_URL = "PATH | URL";
const NAME_FLAG_NAME = "name";

export default class Add extends Command {
  static override description = `Add module to ${color.yellow(
    SERVICE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    [NAME_FLAG_NAME]: Flags.string({
      description: "Override module name",
      helpValue: "<name>",
    }),
    service: Flags.directory({
      description: `Service name from ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )} or path to the service directory`,
      helpValue: "<name | path>",
    }),
  };
  static override args = [
    {
      name: PATH_OR_URL,
      description: "Path to a module or url to .tar.gz archive",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Add);
    const isInteractive = getIsInteractive(flags);

    const modulePathOrUrl: unknown =
      args[PATH_OR_URL] ??
      (await input({
        isInteractive,
        message: "Enter path to a module or url to .tar.gz archive",
      }));

    assert(typeof modulePathOrUrl === "string");

    const modulePath = isUrl(modulePathOrUrl)
      ? await downloadModule(modulePathOrUrl)
      : modulePathOrUrl;

    const moduleConfig = await initReadonlyModuleConfig(modulePath, this);

    if (moduleConfig === null) {
      this.error(
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

    const fluenceConfig = await initFluenceConfig(this);
    let servicePath = serviceNameOrPath;

    if (hasKey(serviceNameOrPath, fluenceConfig?.services)) {
      const serviceGet = fluenceConfig?.services[serviceNameOrPath]?.get;
      assert(typeof serviceGet === "string");
      servicePath = serviceGet;
    }

    if (isUrl(servicePath)) {
      this.error(
        `Can't modify downloaded service ${color.yellow(servicePath)}`
      );
    }

    const serviceConfig = await initServiceConfig(
      path.resolve(servicePath),
      this
    );

    if (serviceConfig === null) {
      this.error(
        `Directory ${color.yellow(servicePath)} does not contain ${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )}`
      );
    }

    const validateModuleName = (name: string): true | string =>
      !(name in (fluenceConfig?.services ?? {})) ||
      `You already have ${color.yellow(name)} in ${color.yellow(
        serviceConfig.$getPath()
      )}`;

    let validModuleName = flags[NAME_FLAG_NAME] ?? moduleConfig.name;
    const serviceNameValidity = validateModuleName(validModuleName);

    if (serviceNameValidity !== true) {
      this.warn(serviceNameValidity);

      validModuleName = await input({
        isInteractive,
        message: `Enter another name for module`,
        validate: validateModuleName,
      });
    }

    serviceConfig.modules = {
      ...serviceConfig.modules,
      [validModuleName]: {
        get: isUrl(modulePathOrUrl)
          ? modulePathOrUrl
          : path.relative(
              path.resolve(servicePath),
              path.resolve(modulePathOrUrl)
            ),
      },
    };

    await serviceConfig.$commit();

    this.log(
      `Added ${color.yellow(validModuleName)} to ${color.yellow(
        replaceHomeDir(path.resolve(servicePath))
      )}`
    );
  }
}
