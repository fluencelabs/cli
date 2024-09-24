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
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ensureComputerPeerConfigs } from "../../lib/configs/project/provider.js";
import {
  CHAIN_FLAGS,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  getFluenceSecretsDir,
  ensureFluenceConfigsDir,
  ensureProviderSecretsConfigPath,
} from "../../lib/paths.js";
import { confirm } from "../../lib/prompt.js";

export default class Gen extends BaseCommand<typeof Gen> {
  static override description = `Generate Config.toml files according to ${PROVIDER_CONFIG_FULL_FILE_NAME} and secrets according to ${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    "reset-secrets": Flags.boolean({
      description: `Remove nox secrets at ${DOT_FLUENCE_DIR_NAME}/${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME} and ${DOT_FLUENCE_DIR_NAME}/${SECRETS_DIR_NAME} to generate new ones`,
      default: false,
    }),
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Gen));
    const providerSecretsConfigPath = await ensureProviderSecretsConfigPath();
    const fluenceSecretsDir = getFluenceSecretsDir();

    if (
      flags["reset-secrets"] &&
      (await confirm({
        message: `Are you sure you want to remove ${color.yellow(providerSecretsConfigPath)} and ${color.yellow(fluenceSecretsDir)} to generate new ones`,
        default: true,
      }))
    ) {
      await rm(providerSecretsConfigPath, { recursive: true, force: true });
      await rm(fluenceSecretsDir, { recursive: true, force: true });
    }

    await ensureComputerPeerConfigs();

    commandObj.logToStderr(
      `Config.toml files for nox are generated at:\n${await ensureFluenceConfigsDir()}\n\nsecrets are generated at:\n${getFluenceSecretsDir()}`,
    );
  }
}
