/**
 * Copyright 2024 Fluence DAO
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
import { ensureComputerPeerConfigs } from "../../lib/configs/project/provider.js";
import {
  CHAIN_FLAGS,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  getFluenceSecretsDir,
  ensureFluenceConfigsDir,
} from "../../lib/paths.js";

export default class Gen extends BaseCommand<typeof Gen> {
  static override description = `Generate Config.toml files according to ${PROVIDER_CONFIG_FULL_FILE_NAME} and secrets according to ${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };
  async run(): Promise<void> {
    await initCli(this, await this.parse(Gen));
    await ensureComputerPeerConfigs();

    commandObj.logToStderr(
      `Config.toml files for nox are generated at:\n${await ensureFluenceConfigsDir()}\n\nsecrets are generated at:\n${getFluenceSecretsDir()}`,
    );
  }
}
