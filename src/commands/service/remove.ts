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
import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import { FLUENCE_CONFIG_FILE_NAME } from "../../lib/const";
import { initCli } from "../../lib/lifecyle";
import { input } from "../../lib/prompt";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove service from ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Service name from ${FLUENCE_CONFIG_FILE_NAME}, path to a service or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { args, isInteractive, fluenceConfig } = await initCli(
      this,
      await this.parse(Remove),
      true
    );

    const nameOrPathOrUrl =
      args[NAME_OR_PATH_OR_URL] ??
      (await input({
        isInteractive,
        message: `Enter service name from ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}, path to a service or url to .tar.gz archive`,
      }));

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
