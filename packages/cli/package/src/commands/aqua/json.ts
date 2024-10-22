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

import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { CUSTOM_TYPES_FLAG, USE_F64_FLAG } from "../../lib/const.js";
import { fileToAqua } from "../../lib/helpers/jsToAqua.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Json extends BaseCommand<typeof Json> {
  static override description =
    "Infers aqua types for an arbitrary json file, generates valid aqua code with a function call that returns an aqua object literal with the same structure as the json file. For valid generation please refer to aqua documentation https://fluence.dev/docs/aqua-book/language/ to learn about what kind of structures are valid in aqua language and what they translate into";
  static override flags = {
    ...USE_F64_FLAG,
    ...CUSTOM_TYPES_FLAG,
  };
  static override args = {
    INPUT: Args.string({
      description: "Path to json file",
    }),
    OUTPUT: Args.string({
      description: `Path to the output dir`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Json));

    await fileToAqua(
      args.INPUT,
      args.OUTPUT,
      flags.f64,
      flags.types,
      JSON.parse,
    );
  }
}
