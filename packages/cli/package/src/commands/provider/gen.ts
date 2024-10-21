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

import { rename } from "fs/promises";
import { basename, join } from "path";

import { color } from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { withdrawFromNox } from "../../lib/chain/distributeToNox.js";
import { commandObj } from "../../lib/commandObj.js";
import { ensureComputerPeerConfigs } from "../../lib/configs/project/provider.js";
import {
  CHAIN_FLAGS,
  PROVIDER_CONFIG_FULL_FILE_NAME,
  PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  SECRETS_DIR_NAME,
  BACKUPS_DIR_NAME,
  ALL_FLAG_VALUE,
  MAX_TOKEN_AMOUNT_KEYWORD,
  CLI_NAME,
} from "../../lib/const.js";
import { pathExists, stringifyUnknown } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  getFluenceSecretsDir,
  ensureFluenceConfigsDir,
  ensureProviderSecretsConfigPath,
  getFluenceBackupsDir,
  ensureDir,
} from "../../lib/paths.js";
import { confirm } from "../../lib/prompt.js";

const RESET_NOX_SECRETS_FLAG_NAME = "reset-nox-secrets";
const NO_WITHDRAW_FLAG_NAME = "no-withdraw";

export default class Gen extends BaseCommand<typeof Gen> {
  static override description = `Generate Config.toml files according to ${PROVIDER_CONFIG_FULL_FILE_NAME} and secrets according to ${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...CHAIN_FLAGS,
    [RESET_NOX_SECRETS_FLAG_NAME]: Flags.boolean({
      description: `Withdraw remaining tokens from your noxes, backup nox secrets from ${DOT_FLUENCE_DIR_NAME}/${PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME} and ${DOT_FLUENCE_DIR_NAME}/${SECRETS_DIR_NAME} (if they exist) to ${DOT_FLUENCE_DIR_NAME}/${BACKUPS_DIR_NAME} and generate new ones`,
      default: false,
    }),
    [NO_WITHDRAW_FLAG_NAME]: Flags.boolean({
      description: `Is used only when --${RESET_NOX_SECRETS_FLAG_NAME} flag is present. Will not withdraw tokens from noxes (if you don't need it or it fails for some reason)`,
      default: false,
    }),
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Gen));
    const providerSecretsConfigPath = await ensureProviderSecretsConfigPath();
    const fluenceSecretsDir = getFluenceSecretsDir();

    const backupDirPath = join(
      getFluenceBackupsDir(),
      `secrets-${new Date().toISOString().replaceAll(":", "")}`,
    );

    if (
      flags[RESET_NOX_SECRETS_FLAG_NAME] &&
      (await confirm({
        message: `Are you sure you want to backup nox secrets ${color.yellow(providerSecretsConfigPath)} and ${color.yellow(fluenceSecretsDir)} (if they exist) to ${color.yellow(backupDirPath)} and generate new ones`,
        default: flags[RESET_NOX_SECRETS_FLAG_NAME],
      }))
    ) {
      if (
        !flags[NO_WITHDRAW_FLAG_NAME] &&
        (await confirm({
          message:
            "Do you want to withdraw remaining tokens from your noxes before continuing",
          default: !flags[NO_WITHDRAW_FLAG_NAME],
        }))
      ) {
        try {
          await withdrawFromNox({
            "nox-names": ALL_FLAG_VALUE,
            amount: MAX_TOKEN_AMOUNT_KEYWORD,
          });
        } catch (e) {
          return commandObj.error(
            `Failed to withdraw tokens from noxes. Try using ${color.yellow(`${CLI_NAME} provider tokens-withdraw`)} command with specific nox names and amounts or don't withdraw anything if you don't need to by using --${NO_WITHDRAW_FLAG_NAME} flag. Error: ${stringifyUnknown(e)}`,
          );
        }
      }

      await backUpSecrets(
        providerSecretsConfigPath,
        fluenceSecretsDir,
        backupDirPath,
      );
    }

    await ensureComputerPeerConfigs();

    commandObj.logToStderr(
      `Config.toml files for nox are generated at:\n${await ensureFluenceConfigsDir()}\n\nsecrets are generated at:\n${getFluenceSecretsDir()}`,
    );
  }
}

async function backUpSecrets(
  providerSecretsConfigPath: string,
  fluenceSecretsDir: string,
  backupDirPath: string,
) {
  if (await pathExists(providerSecretsConfigPath)) {
    await ensureDir(backupDirPath);

    await rename(
      providerSecretsConfigPath,
      join(backupDirPath, basename(providerSecretsConfigPath)),
    );
  }

  if (await pathExists(fluenceSecretsDir)) {
    await ensureDir(backupDirPath);

    await rename(
      fluenceSecretsDir,
      join(backupDirPath, basename(fluenceSecretsDir)),
    );
  }
}
