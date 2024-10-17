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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { FLUENCE_CONFIG_FULL_FILE_NAME, IMPORT_FLAG } from "../../lib/const.js";
import { compileSpells } from "../../lib/deployWorkers.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Build extends BaseCommand<typeof Build> {
  static override description =
    "Check spells aqua is able to compile without any errors";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...IMPORT_FLAG,
  };
  static override args = {
    "SPELL-NAMES": Args.string({
      description: `Comma separated names of spells to build. Example: "spell1,spell2" (by default all spells from 'spells' property in ${FLUENCE_CONFIG_FULL_FILE_NAME} will be built)`,
    }),
  };
  async run(): Promise<void> {
    const { args, fluenceConfig, flags } = await initCli(
      this,
      await this.parse(Build),
      true,
    );

    const spellNames = commaSepStrToArr(
      args["SPELL-NAMES"] ?? Object.keys(fluenceConfig.spells ?? {}).join(","),
    );

    await compileSpells(fluenceConfig, flags.import, spellNames);

    commandObj.log(
      `Compiled ${color.yellow(spellNames.join(", "))} successfully`,
    );
  }
}
