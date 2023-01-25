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

import color from "@oclif/color";

import { BaseCommand } from "../../baseCommand";
import { generateNewModule } from "../../lib/generateNewModule";
import { getArg } from "../../lib/helpers/getArg";
import { initCli } from "../../lib/lifecyle";
import { input } from "../../lib/prompt";

const PATH = "PATH";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create new marine module template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override args = {
    [PATH]: getArg(PATH, "Module path"),
  };
  async run(): Promise<void> {
    const { args, isInteractive } = await initCli(this, await this.parse(New));

    const pathToModuleDir =
      args[PATH] ??
      (await input({ isInteractive, message: "Enter module path" }));

    await generateNewModule(pathToModuleDir, this);

    this.log(
      `Successfully generated template for new module at ${color.yellow(
        pathToModuleDir
      )}`
    );
  }
}
