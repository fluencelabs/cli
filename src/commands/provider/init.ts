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

import { rm } from "fs/promises";

import { color } from "@oclif/color";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  initNewReadonlyProviderConfig,
  initReadonlyProviderConfig,
} from "../../lib/configs/project/provider.js";
import { PROVIDER_CONFIG_FLAGS, NOXES_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { setProviderConfigName } from "../../lib/paths.js";
import { confirm } from "../../lib/prompt.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description =
    "Init provider config. Creates a config file in the current directory.";
  static override flags = {
    ...baseFlags,
    ...NOXES_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Init));
    setProviderConfigName(flags.name);

    let providerConfig = await initReadonlyProviderConfig();

    if (providerConfig !== null) {
      const isOverwriting = await confirm({
        message: `Provider config already exists at ${color.yellow(
          providerConfig.$getPath(),
        )}. Do you want to overwrite it?`,
        default: false,
      });

      if (!isOverwriting) {
        return commandObj.error(
          `Provider config already exists at ${color.yellow(
            providerConfig.$getPath(),
          )}. Aborting.`,
        );
      }

      await rm(providerConfig.$getPath(), { force: true });
    }

    providerConfig = await initNewReadonlyProviderConfig({
      numberOfNoxes: flags.noxes,
      env: flags.env,
    });

    commandObj.logToStderr(
      `Successfully created provider config at ${color.yellow(
        providerConfig.$getPath(),
      )}`,
    );
  }
}
