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
