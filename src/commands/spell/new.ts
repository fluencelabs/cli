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

import assert from "assert";
import { access, mkdir, writeFile } from "fs/promises";
import { join, relative } from "path";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import { initNewReadonlySpellConfig } from "../../lib/configs/project/spell.js";
import {
  FS_OPTIONS,
  getSpellAquaFileContent,
  SPELL_AQUA_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureSpellsDir, projectRootDir } from "../../lib/paths.js";
import { checkboxes, input } from "../../lib/prompt.js";

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

    const pathToSpellsDir = flags.path ?? (await ensureSpellsDir());

    function getPathToSpellDir(spellName: string) {
      return join(pathToSpellsDir, spellName);
    }

    async function validateSpellName(spellName: string) {
      if (maybeFluenceConfig?.spells?.[spellName] !== undefined) {
        return `Spell ${color.yellow(spellName)} already exists in ${maybeFluenceConfig.$getPath()}`;
      }

      const pathToSpellDir = getPathToSpellDir(spellName);

      try {
        await access(pathToSpellDir);
        return `There is already a file or directory at ${color.yellow(pathToSpellDir)}`;
      } catch {}

      return true;
    }

    const spellName =
      args.name ??
      (await input({
        message: "Enter spell name",
        validate(spellName: string) {
          return validateSpellName(spellName);
        },
      }));

    const spellNameValidity = await validateSpellName(spellName);

    if (spellNameValidity !== true) {
      return commandObj.error(spellNameValidity);
    }

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

    const deployments = Object.keys(fluenceConfig.deployments ?? {});

    if (!isInteractive || deployments.length === 0) {
      return;
    }

    const deploymentNames = await checkboxes({
      message: `If you want to add spell ${color.yellow(spellName)} to some of the deployments - please select them or press enter to continue`,
      options: deployments,
      oneChoiceMessage(deploymentName) {
        return `Do you want to add spell ${color.yellow(spellName)} to deployment ${color.yellow(deploymentName)}`;
      },
      onNoChoices(): Array<string> {
        return [];
      },
    });

    if (deploymentNames.length === 0) {
      commandObj.logToStderr(
        `No deployments selected. You can add it manually later at ${fluenceConfig.$getPath()}`,
      );

      return;
    }

    deploymentNames.forEach((deploymentName) => {
      assert(
        fluenceConfig.deployments !== undefined,
        "Unreachable. It's checked above that fluenceConfig.deployments is not undefined",
      );

      const deployment = fluenceConfig.deployments[deploymentName];

      assert(
        deployment !== undefined,
        "Unreachable. deploymentName is guaranteed to exist in fluenceConfig.deployments",
      );

      fluenceConfig.deployments[deploymentName] = {
        ...deployment,
        spells: [...(deployment.spells ?? []), spellName],
      };
    });

    await fluenceConfig.$commit();

    commandObj.log(
      `Added spell ${color.yellow(spellName)} to deployments: ${color.yellow(
        deploymentNames.join(", "),
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
