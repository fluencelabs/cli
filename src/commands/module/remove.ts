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
import {
  FACADE_MODULE_NAME,
  initServiceConfig,
} from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import { isUrl } from "../../lib/helpers/downloadFile";
import { initCli } from "../../lib/lifecyle";
import { input } from "../../lib/prompt";
import { hasKey } from "../../lib/typeHelpers";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove module from ${SERVICE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
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
    const { args, flags, isInteractive, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Remove)
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await input({
        isInteractive,
        message: `Enter module name from ${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )}, path to a module or url to .tar.gz archive`,
      }));

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

    if (nameOrPathOrUrl === FACADE_MODULE_NAME) {
      this.error(
        `Each service must have a facade module, if you want to change it either override it in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )} or replace it manually in ${color.yellow(SERVICE_CONFIG_FILE_NAME)}`
      );
    } else if (nameOrPathOrUrl in serviceConfig.modules) {
      delete serviceConfig.modules[nameOrPathOrUrl];
    } else if (
      Object.values(serviceConfig.modules).some(
        ({ get }): boolean => get === nameOrPathOrUrl
      )
    ) {
      const [moduleName] =
        Object.entries(serviceConfig.modules).find(
          ([, { get }]): boolean => get === nameOrPathOrUrl
        ) ?? [];

      assert(typeof moduleName === "string");
      delete serviceConfig.modules[moduleName];
    } else {
      this.error(
        `There is no module ${color.yellow(nameOrPathOrUrl)} in ${color.yellow(
          servicePath
        )}`
      );
    }

    await serviceConfig.$commit();

    this.log(
      `Removed module ${color.yellow(nameOrPathOrUrl)} from ${color.yellow(
        servicePath
      )}`
    );
  }
}
