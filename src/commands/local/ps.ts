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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
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
    ...baseFlags,
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
