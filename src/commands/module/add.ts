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
import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module";
import { initServiceConfig } from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  MODULE_CONFIG_FILE_NAME,
  NAME_FLAG_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import { downloadModule, isUrl } from "../../lib/helpers/downloadFile";
import { getArg } from "../../lib/helpers/getArg";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir";
import { initCli } from "../../lib/lifecyle";
import { input } from "../../lib/prompt";
import { hasKey } from "../../lib/typeHelpers";

const PATH_OR_URL = "PATH | URL";

export default class Add extends BaseCommand<typeof Add> {
  static override description = `Add module to ${SERVICE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    [NAME_FLAG_NAME]: Flags.string({
      description: "Override module name",
      helpValue: "<name>",
    }),
    service: Flags.directory({
      description: `Service name from ${FLUENCE_CONFIG_FILE_NAME} or path to the service directory`,
      helpValue: "<name | path>",
    }),
  };
  static override args = {
    [PATH_OR_URL]: getArg(
      PATH_OR_URL,
      "Path to a module or url to .tar.gz archive"
    ),
  };
  async run(): Promise<void> {
    const { args, flags, isInteractive, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Add)
    );

    const modulePathOrUrl =
      args[PATH_OR_URL] ??
      (await input({
        isInteractive,
        message: "Enter path to a module or url to .tar.gz archive",
      }));

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

    let servicePath = serviceNameOrPath;

    if (hasKey(serviceNameOrPath, maybeFluenceConfig?.services)) {
      const serviceGet = maybeFluenceConfig?.services[serviceNameOrPath]?.get;
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
      !(name in (maybeFluenceConfig?.services ?? {})) ||
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
