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
import { initNewDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import { DOCKER_COMPOSE_FULL_FILE_NAME } from "../../lib/const.js";
import { dockerCompose } from "../../lib/dockerCompose.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Restart extends BaseCommand<typeof Restart> {
  static override description = `Restart ${DOCKER_COMPOSE_FULL_FILE_NAME} using docker compose`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    await initCli(this, await this.parse(Restart));
    const dockerComposeConfig = await initNewDockerComposeConfig();

    await dockerCompose({
      args: ["restart"],
      printOutput: true,
      options: {
        cwd: dockerComposeConfig.$getDirPath(),
      },
    });
  }
}
