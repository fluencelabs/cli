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
import { stringToServiceName } from "../../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { usage } from "../../lib/helpers/usage";

const SERVICE = "SERVICE";

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
      name: SERVICE,
      description:
        "Service name, relative path to a service or url to .tar.gz archive",
    },
  ];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Remove);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    assert(typeof args[SERVICE] === "string");
    const fluenceConfig = await initFluenceConfig(this);
    if (fluenceConfig.services === undefined) {
      this.error(
        `There are no services in ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}`
      );
    }
    const serviceName = stringToServiceName(args[SERVICE]);
    if (!(serviceName in fluenceConfig.services)) {
      this.error(
        `There is no service ${color.yellow(serviceName)} in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}`
      );
    }
    delete fluenceConfig.services[serviceName];
    if (Object.keys(fluenceConfig.services).length === 0) {
      delete fluenceConfig.services;
    }
    await fluenceConfig.$commit();
    this.log(
      `Removed ${color.yellow(serviceName)} from ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}`
    );
  }
}
