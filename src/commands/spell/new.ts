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

import { mkdir, writeFile } from "fs/promises";
import { join } from "path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initNewReadonlySpellConfig } from "../../lib/configs/project/spell.js";
import {
  FS_OPTIONS,
  SPELL_AQUA_FILE_CONTENT,
  SPELL_AQUA_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create a new spell template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    path: Args.string({
      description: "Spell path",
    }),
  };
  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(New));

    const pathToSpellDir =
      args.path ?? (await input({ message: "Enter module path" }));

    await generateNewSpell(pathToSpellDir);

    commandObj.log(
      `Successfully generated template for new spell at ${color.yellow(
        pathToSpellDir
      )}`
    );
  }
}

const generateNewSpell = async (pathToSpellDir: string) => {
  await mkdir(pathToSpellDir, { recursive: true });

  await writeFile(
    join(pathToSpellDir, SPELL_AQUA_FILE_NAME),
    SPELL_AQUA_FILE_CONTENT,
    FS_OPTIONS
  );

  await initNewReadonlySpellConfig(pathToSpellDir);
};
