/**
 * Copyright 2022 Fluence Labs Limited
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

import assert from "node:assert";
import fsPromises from "node:fs/promises";
import path from "node:path";

import color from "@oclif/color";
import { Command } from "@oclif/core";

import { initNewReadonlyModuleConfig } from "../../lib/configs/project/module";
import { CommandObj, NO_INPUT_FLAG } from "../../lib/const";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { initMarineCli } from "../../lib/marineCli";

const PATH = "PATH";

export default class New extends Command {
  static override description = "Create new marine module template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: PATH,
      description: "Path to a module",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(New);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);
    const pathToModuleDir: unknown = args[PATH];
    assert(typeof pathToModuleDir === "string");
    await generateNewModule(pathToModuleDir, this);

    this.log(
      `Successfully generated template for new module at ${color.yellow(
        pathToModuleDir
      )}`
    );
  }
}

export const generateNewModule = async (
  pathToModuleDir: string,
  commandObj: CommandObj
): Promise<void> => {
  await fsPromises.mkdir(pathToModuleDir, { recursive: true });
  const marineCli = await initMarineCli(commandObj);
  const name = path.basename(pathToModuleDir);

  await marineCli({
    command: "generate",
    flags: { init: true, name },
    workingDir: pathToModuleDir,
  });

  await initNewReadonlyModuleConfig(pathToModuleDir, commandObj, name);
};
