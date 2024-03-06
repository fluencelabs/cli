/**
 * Copyright 2023 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
