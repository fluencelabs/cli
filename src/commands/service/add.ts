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
import { Command, Flags } from "@oclif/core";
import camelcase from "camelcase";

import { initFluenceConfig } from "../../lib/configs/project/fluence";
import {
  DEFAULT_DEPLOY_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  NO_INPUT_FLAG,
} from "../../lib/const";
import { stringToServiceName } from "../../lib/helpers/downloadFile";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { usage } from "../../lib/helpers/usage";

const SERVICE_ARG = "PATH | URL";
const NAME_FLAG_NAME = "name";

export default class Add extends Command {
  static override description = `Add service to ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    [NAME_FLAG_NAME]: Flags.string({
      description: "Unique service name",
      helpValue: "<name>",
    }),
  };
  static override args = [
    {
      name: SERVICE_ARG,
      description: "Relative path to a service or url to .tar.gz archive",
    },
  ];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Add);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    assert(typeof args[SERVICE_ARG] === "string");
    const fluenceConfig = await initFluenceConfig(this);
    if (fluenceConfig.services === undefined) {
      fluenceConfig.services = {};
    }
    const serviceName =
      flags[NAME_FLAG_NAME] ?? stringToServiceName(args[SERVICE_ARG]);
    if (camelcase(serviceName) !== serviceName) {
      this.error("Service name must be in camelCase");
    }
    if (serviceName in fluenceConfig.services) {
      this.error(
        `You already have ${color.yellow(serviceName)} in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )}. Provide a unique name for the new service using ${color.yellow(
          `--${NAME_FLAG_NAME}`
        )} flag or edit the existing service in ${color.yellow(
          FLUENCE_CONFIG_FILE_NAME
        )} manually`
      );
    }
    fluenceConfig.services = {
      ...fluenceConfig.services,
      [serviceName]: {
        get: args[SERVICE_ARG],
        deploy: {
          [DEFAULT_DEPLOY_NAME]: {
            count: 1,
          },
        },
      },
    };
    await fluenceConfig.$commit();
    this.log(
      `Added ${color.yellow(serviceName)} to ${color.yellow(
        FLUENCE_CONFIG_FILE_NAME
      )}`
    );
  }
}
