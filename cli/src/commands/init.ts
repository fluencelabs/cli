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

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { TEMPLATES, ENV_FLAG, NOXES_FLAG } from "../lib/const.js";
import { ensureTemplate, init } from "../lib/init.js";
import { initCli } from "../lib/lifeCycle.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    template: Flags.string({
      description: `Template to use for the project. One of: ${TEMPLATES.join(
        ", ",
      )}`,
      char: "t",
    }),
    ...ENV_FLAG,
    ...NOXES_FLAG,
  };
  static override args = {
    path: Args.string({
      description: "Project path",
    }),
  };
  async run(): Promise<void> {
    const { flags, args } = await initCli(this, await this.parse(Init));

    await init({
      ...flags,
      maybeProjectPath: args.path,
      template: await ensureTemplate({
        templateOrUnknown: flags.template,
      }),
    });
  }
}
