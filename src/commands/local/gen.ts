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
import { initNewDockerComposeConfig } from "../../lib/configs/project/dockerCompose.js";
import {
  initProviderConfig,
  initNewProviderConfig,
} from "../../lib/configs/project/provider.js";
import {
  DOCKER_COMPOSE_FULL_FILE_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { generateUserProviderConfig } from "../../lib/generateUserProviderConfig.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm } from "../../lib/prompt.js";

export default class Gen extends BaseCommand<typeof Gen> {
  static override description = `Create ${DOCKER_COMPOSE_FULL_FILE_NAME} according to ${PROVIDER_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    await initCli(this, await this.parse(Gen));
    let providerConfig = await initProviderConfig();

    if (providerConfig === null) {
      if (
        await confirm({
          message: `Provider config doesn't exist. Do you want to create it?`,
        })
      ) {
        const userProviderConfig = await generateUserProviderConfig();
        providerConfig = await initNewProviderConfig(userProviderConfig);
      } else {
        commandObj.error(
          `Provider config config is required for local setup. Aborting.`,
        );
      }
    }

    const noxNames = Object.keys(providerConfig.computePeers);
    const dockerCompose = await initNewDockerComposeConfig(noxNames);

    commandObj.logToStderr(
      `Successfully generated ${DOCKER_COMPOSE_FULL_FILE_NAME} at ${dockerCompose.$getPath()}`,
    );
  }
}
