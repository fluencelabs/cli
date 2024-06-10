/**
 * Copyright 2024 Fluence DAO
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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  initNewReadonlyProviderConfig,
  initReadonlyProviderConfig,
} from "../../lib/configs/project/provider.js";
import {
  CHAIN_FLAGS,
  NOXES_FLAG,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description = `Init provider config. Creates a ${PROVIDER_CONFIG_FULL_FILE_NAME} file`;
  static override flags = {
    ...baseFlags,
    ...NOXES_FLAG,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Init));

    let providerConfig = await initReadonlyProviderConfig();

    if (providerConfig !== null) {
      return commandObj.error(
        `Provider config already exists at ${color.yellow(
          providerConfig.$getPath(),
        )}. If you want to init a new provider config, please do it in another directory`,
      );
    }

    providerConfig = await initNewReadonlyProviderConfig(flags);

    commandObj.logToStderr(
      `Provider config is at ${color.yellow(providerConfig.$getPath())}`,
    );
  }
}
