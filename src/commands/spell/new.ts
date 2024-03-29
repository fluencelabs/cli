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
import { join, relative } from "path";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import { initNewReadonlySpellConfig } from "../../lib/configs/project/spell.js";
import {
  DEFAULT_DEPLOYMENT_NAME,
  FS_OPTIONS,
  getSpellAquaFileContent,
  SPELL_AQUA_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureSpellsDir, projectRootDir } from "../../lib/paths.js";
import { confirm, input } from "../../lib/prompt.js";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create a new spell template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    path: Flags.string({
      description: "Path to spells dir (default: src/spells)",
      helpValue: "<path>",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Spell name",
    }),
  };
  async run(): Promise<void> {
    const { args, maybeFluenceConfig, flags } = await initCli(
      this,
      await this.parse(New),
    );

    const spellName =
      args.name ?? (await input({ message: "Enter spell name" }));

    const pathToSpellsDir = flags.path ?? (await ensureSpellsDir());
    const pathToSpellDir = join(pathToSpellsDir, spellName);
    await generateNewSpell(pathToSpellDir, spellName);

    commandObj.log(
      `Successfully generated template for new spell at ${color.yellow(
        pathToSpellDir,
      )}`,
    );

    if (maybeFluenceConfig === null) {
      return;
    }

    const fluenceConfig = maybeFluenceConfig;

    if (fluenceConfig.spells === undefined) {
      fluenceConfig.spells = {};
    }

    fluenceConfig.spells[spellName] = {
      get: relative(projectRootDir, pathToSpellDir),
    };

    await fluenceConfig.$commit();

    if (
      !(
        isInteractive &&
        fluenceConfig.deployments !== undefined &&
        DEFAULT_DEPLOYMENT_NAME in fluenceConfig.deployments &&
        !(
          fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME].spells ?? []
        ).includes(spellName) &&
        (await confirm({
          message: `Do you want to add spell ${color.yellow(
            spellName,
          )} to a default deployment ${color.yellow(DEFAULT_DEPLOYMENT_NAME)}`,
        }))
      )
    ) {
      return;
    }

    const defaultDeployment =
      fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME];

    fluenceConfig.deployments[DEFAULT_DEPLOYMENT_NAME] = {
      ...defaultDeployment,
      spells: [...(defaultDeployment.spells ?? []), spellName],
    };

    await fluenceConfig.$commit();

    commandObj.log(
      `Added ${color.yellow(spellName)} to ${color.yellow(
        DEFAULT_DEPLOYMENT_NAME,
      )}`,
    );
  }
}

async function generateNewSpell(pathToSpellDir: string, spellName: string) {
  await mkdir(pathToSpellDir, { recursive: true });

  await writeFile(
    join(pathToSpellDir, SPELL_AQUA_FILE_NAME),
    getSpellAquaFileContent(spellName),
    FS_OPTIONS,
  );

  await initNewReadonlySpellConfig(pathToSpellDir);
}
