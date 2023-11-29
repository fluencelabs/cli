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

import { join } from "path";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initNewReadonlyProviderConfig } from "../../lib/configs/project/provider.js";
import {
  PROVIDER_CONFIG_FLAGS,
  NOXES_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { getFluenceDir, projectRootDir } from "../../lib/paths.js";

export default class Gen extends BaseCommand<typeof Gen> {
  static override description = `Generate Config.toml files according to ${PROVIDER_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...NOXES_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
  };
  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Gen));
    await initNewReadonlyProviderConfig(flags);

    commandObj.logToStderr(
      `Configuration is generated at ${
        flags.name === undefined
          ? getFluenceDir()
          : join(projectRootDir, flags.name)
      }`,
    );
  }
}
