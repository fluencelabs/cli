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

import { rm } from "fs/promises";

import { color } from "@oclif/color";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  initNewDockerComposeConfig,
  initReadonlyDockerComposeConfig,
} from "../../lib/configs/project/dockerCompose.js";
import {
  PROVIDER_CONFIG_FLAGS,
  DOCKER_COMPOSE_FULL_FILE_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm } from "../../lib/prompt.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description = `Init ${DOCKER_COMPOSE_FULL_FILE_NAME} according to ${PROVIDER_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...PROVIDER_CONFIG_FLAGS,
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Init));
    const existingDockerCompose = await initReadonlyDockerComposeConfig();

    if (existingDockerCompose !== null) {
      const isOverwriting = await confirm({
        message: `Do you want to replace existing ${color.yellow(
          existingDockerCompose.$getPath(),
        )}`,
        default: false,
      });

      if (!isOverwriting) {
        commandObj.error(
          `The config already exists at ${existingDockerCompose.$getPath()}. Aborting.`,
        );
      }

      await rm(existingDockerCompose.$getPath());
    }

    const dockerCompose = await initNewDockerComposeConfig({
      numberOfNoxes: flags.noxes,
    });

    commandObj.logToStderr(`Created new config at ${dockerCompose.$getPath()}`);
  }
}
