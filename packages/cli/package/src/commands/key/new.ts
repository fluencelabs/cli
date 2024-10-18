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

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import {
  PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { createSecretKey } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class New extends BaseCommand<typeof New> {
  static override description = `Generate key-pair and store it in ${USER_SECRETS_CONFIG_FULL_FILE_NAME} or ${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    user: Flags.boolean({
      default: false,
      description:
        "Generate key-pair for current user instead of generating key-pair for current project",
    }),
    default: Flags.boolean({
      default: false,
      description: "Set new key-pair as default for current project or user",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Key-pair name",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(New),
    );

    await createSecretKey({
      isUser: flags.user,
      name: args.name,
      maybeFluenceConfig,
    });
  }
}
