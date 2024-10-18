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
import { setDefaultSecretKey } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Default extends BaseCommand<typeof Default> {
  static override description = "Set default key-pair for user or project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    user: Flags.boolean({
      default: false,
      description:
        "Set default key-pair for current user instead of current project",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Key-pair name",
    }),
  };
  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Default));
    await setDefaultSecretKey({ isUser: flags.user, name: args.name });
  }
}
