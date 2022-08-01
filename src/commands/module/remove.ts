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
import {
  FACADE_MODULE_NAME,
  initServiceConfig,
} from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  NO_INPUT_FLAG,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import { isUrl } from "../../lib/helpers/downloadFile";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { input } from "../../lib/prompt";
import { hasKey } from "../../lib/typeHelpers";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends Command {
  static override description = `Remove module from ${color.yellow(
    SERVICE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    service: Flags.directory({
      description: `Service name from ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )} or path to the service directory`,
      helpValue: "<name | path>",
    }),
  };
  static override args = [
    {
      name: NAME_OR_PATH_OR_URL,
      description: `Module name from ${color.yellow(
        SERVICE_CONFIG_FILE_NAME
      )}, path to a module or url to .tar.gz archive`,
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Remove);
    const isInteractive = getIsInteractive(flags);
    const nameOrPathOrUrlFromArgs: unknown = args[NAME_OR_PATH_OR_URL];
    assert(
      typeof nameOrPathOrUrlFromArgs === "string" ||
        typeof nameOrPathOrUrlFromArgs === "undefined"
    );
    const nameOrPathOrUrl =
      nameOrPathOrUrlFromArgs ??
      (await input({
        isInteractive,
        message: `Enter module name from ${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )}, path to a module or url to .tar.gz archive`,
      }));
    assert(typeof nameOrPathOrUrl === "string");
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
