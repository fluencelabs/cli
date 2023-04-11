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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Reset extends BaseCommand<typeof Reset> {
  static override aliases = ["dependency:r", "dep:r"];
  static override description = `Reset all project dependencies to recommended versions for the current Fluence CLI version`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    const { fluenceConfig } = await initCli(
      this,
      await this.parse(Reset),
      true
    );

    delete fluenceConfig.dependencies;
    await fluenceConfig.$commit();

    commandObj.log("cargo and npm dependencies successfully installed");
  }
}
