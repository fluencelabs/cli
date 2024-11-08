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

import { color } from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  initNewProviderConfig,
  initProviderConfig,
} from "../../lib/configs/project/provider/provider.js";
import {
  CHAIN_FLAGS,
  NOXES_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description = `Init provider config. Creates a ${PROVIDER_CONFIG_FULL_FILE_NAME} file`;
  static override flags = {
    ...NOXES_FLAG,
    ...CHAIN_FLAGS,
    "no-vm": Flags.boolean({
      description: `Generate ${PROVIDER_CONFIG_FULL_FILE_NAME} without vm configuration`,
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Init));

    let providerConfig = await initProviderConfig();

    if (providerConfig !== null) {
      return commandObj.error(
        `Provider config already exists at ${color.yellow(
          providerConfig.$getPath(),
        )}. If you want to init a new provider config, please do it in another directory`,
      );
    }

    providerConfig = await initNewProviderConfig(flags);

    commandObj.logToStderr(
      `Provider config is at ${color.yellow(providerConfig.$getPath())}`,
    );
  }
}
