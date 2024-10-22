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

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import {
  DOCKER_COMPOSE_FULL_FILE_NAME,
  DOCKER_COMPOSE_FLAGS,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class PS extends BaseCommand<typeof PS> {
  static override description = `List containers using docker compose`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...DOCKER_COMPOSE_FLAGS,
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(PS));
    const dockerComposeConfig = await initReadonlyDockerComposeConfig();

    if (dockerComposeConfig === null) {
      commandObj.error(
        `Cannot find ${DOCKER_COMPOSE_FULL_FILE_NAME}. Aborting.`,
      );
    }

    const psResult = await dockerCompose({
      args: [
        "ps",
        ...(flags.flags === undefined ? [] : flags.flags.split(" ")),
      ],
      options: {
        cwd: dockerComposeConfig.$getDirPath(),
      },
    });

    commandObj.log(psResult);
  }
}
