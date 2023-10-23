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

import { color } from "@oclif/color";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { envConfig } from "../../lib/configs/globalConfigs.js";
import { ENV_ARG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  ensureValidEnvFlag,
  fluenceEnvPrompt,
  ensureCustomAddrsAndPeerIds,
  updateRelaysJSON,
} from "../../lib/multiaddres.js";

export default class Peers extends BaseCommand<typeof Peers> {
  static override description =
    "Switch default Fluence Environment used in the current Fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    ...ENV_ARG,
  };
  async run(): Promise<void> {
    const { args, fluenceConfig } = await initCli(
      this,
      await this.parse(Peers),
      true,
    );

    assert(envConfig !== null, "this command requires fluence project");
    const fluenceEnvFromArgs = await ensureValidEnvFlag(args.ENV);

    const newFluenceEnv =
      fluenceEnvFromArgs === undefined
        ? await fluenceEnvPrompt()
        : fluenceEnvFromArgs;

    if (
      newFluenceEnv === "custom" &&
      fluenceConfig.customFluenceEnv === undefined
    ) {
      await ensureCustomAddrsAndPeerIds(fluenceConfig);
    }

    envConfig.fluenceEnv = newFluenceEnv;
    await envConfig.$commit();
    await updateRelaysJSON({ fluenceConfig });

    commandObj.log(
      `Successfully set default fluence environment to ${color.yellow(
        newFluenceEnv,
      )}`,
    );
  }
}
