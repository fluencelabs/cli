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

import { readFile } from "fs/promises";

import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { FS_OPTIONS } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Beautify extends BaseCommand<typeof Beautify> {
  static override hiddenAliases = ["air:b"];
  static override description = `Prints AIR script in human-readable Python-like representation. This representation cannot be executed and is intended to be read by mere mortals${aliasesText.apply(this)}`;
  static override args = {
    PATH: Args.string({
      description: `Path to an AIR file. Must be relative to the current working directory or absolute`,
      helpValue: "<path>",
      char: "i",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(Beautify));

    const inputArg =
      args.PATH ??
      (await input({
        message: `Enter a path to an AIR file`,
      }));

    const air = await readFile(inputArg, FS_OPTIONS);
    const { beautify } = await import("@fluencelabs/air-beautify-wasm");
    commandObj.log(beautify(air));
  }
}
