/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { rm } from "fs/promises";

import { color } from "@oclif/color";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  ensureDockerComposeConfig,
  checkDockerComposeConfigExists,
} from "../../lib/configs/project/dockerCompose.js";
import { initNewProviderConfig } from "../../lib/configs/project/provider/provider.js";
import {
  DOCKER_COMPOSE_FULL_FILE_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  CHAIN_FLAGS,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm } from "../../lib/prompt.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description = `Init ${DOCKER_COMPOSE_FULL_FILE_NAME} according to ${PROVIDER_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...CHAIN_FLAGS,
  };
  async run(): Promise<void> {
    await initCli(this, await this.parse(Init));
    await initNewProviderConfig();
    const existingDockerComposePath = await checkDockerComposeConfigExists();

    if (existingDockerComposePath !== null) {
      const isOverwriting = await confirm({
        message: `Do you want to replace existing ${color.yellow(
          existingDockerComposePath,
        )}`,
        default: false,
      });

      if (!isOverwriting) {
        commandObj.error(
          `The config already exists at ${existingDockerComposePath}. Aborting.`,
        );
      }

      await rm(existingDockerComposePath);
    }

    const dockerComposePath = await ensureDockerComposeConfig();
    commandObj.logToStderr(`Created new config at ${dockerComposePath}`);
  }
}
