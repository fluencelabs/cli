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

import { dirname } from "path";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { ensureDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import {
  DOCKER_COMPOSE_FULL_FILE_NAME,
  DOCKER_COMPOSE_FLAGS,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Down extends BaseCommand<typeof Down> {
  static override description = `Stop and remove currently running ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    volumes: Flags.boolean({
      char: "v",
      description:
        'Remove named volumes declared in the "volumes" section of the Compose file and anonymous volumes attached to containers',
      default: false,
    }),
    ...DOCKER_COMPOSE_FLAGS,
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Down));
    const dockerComposeConfigPath = await ensureDockerComposeConfig();

    await dockerCompose({
      args: [
        "down",
        ...(flags.flags === undefined ? [] : flags.flags.split(" ")),
      ],
      flags: { v: flags.volumes },
      printOutput: true,
      options: { cwd: dirname(dockerComposeConfigPath) },
    });
  }
}
