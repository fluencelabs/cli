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

import color from "@oclif/color";
import { Command } from "@oclif/core";

import { initFluenceConfig } from "../../lib/configs/project/fluence";
import { FLUENCE_CONFIG_FILE_NAME, NO_INPUT_FLAG } from "../../lib/const";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { input } from "../../lib/prompt";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends Command {
  static override description = `Remove service from ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: NAME_OR_PATH_OR_URL,
      description: `Service name from ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}, path to a service or url to .tar.gz archive`,
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Remove);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);
    const nameOrPathOrUrlFromArgs: unknown = args[NAME_OR_PATH_OR_URL];
    assert(
      typeof nameOrPathOrUrlFromArgs === "string" ||
        typeof nameOrPathOrUrlFromArgs === "undefined"
    );
    const nameOrPathOrUrl =
      nameOrPathOrUrlFromArgs ??
      (await input({
        isInteractive,
        message: `Enter service name from ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}, path to a service or url to .tar.gz archive`,
      }));
    const fluenceConfig = await initFluenceConfig(this);
    if (fluenceConfig === null) {
      this.error("You must init Fluence project first to remove services");
    }
    if (fluenceConfig.services === undefined) {
      this.error(
        `There are no services in ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}`
      );
    }
    if (nameOrPathOrUrl in fluenceConfig.services) {
      delete fluenceConfig.services[nameOrPathOrUrl];
    } else if (
      Object.values(fluenceConfig.services).some(
        ({ get }): boolean => get === nameOrPathOrUrl
      )
    ) {
      const [serviceName] =
        Object.entries(fluenceConfig.services).find(
          ([, { get }]): boolean => get === nameOrPathOrUrl
        ) ?? [];
      assert(typeof serviceName === "string");
      delete fluenceConfig.services[serviceName];
    } else {
      this.error(
        `There is no service ${color.yellow(nameOrPathOrUrl)} in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}`
      );
    }
    if (Object.keys(fluenceConfig.services).length === 0) {
      delete fluenceConfig.services;
    }
    await fluenceConfig.$commit();
    this.log(
      `Removed service ${color.yellow(nameOrPathOrUrl)} from ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}`
    );
  }
}
