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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import {
  DOCKER_COMPOSE_FULL_FILE_NAME,
  DOCKER_COMPOSE_FLAGS,
} from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Down extends BaseCommand<typeof Down> {
  static override description = `Stop currently running ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
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
    const dockerComposeConfig = await initReadonlyDockerComposeConfig();

    if (dockerComposeConfig === null) {
      commandObj.error(
        `Cannot find ${DOCKER_COMPOSE_FULL_FILE_NAME}. Aborting.`,
      );
    }

    await dockerCompose({
      args: [
        "down",
        ...(flags.flags === undefined ? [] : flags.flags.split(" ")),
      ],
      flags: {
        v: flags.volumes,
      },
      printOutput: true,
      options: {
        cwd: dockerComposeConfig.$getDirPath(),
      },
    });
  }
}
