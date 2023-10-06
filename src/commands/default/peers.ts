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
import { ENV_ARG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  getLocalNodes,
  resolveFluenceEnv,
  resolveRelays,
} from "../../lib/multiaddres.js";

export default class Peers extends BaseCommand<typeof Peers> {
  static override description = "Print default Fluence network peer addresses";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    ...ENV_ARG,
  };
  async run(): Promise<void> {
    const { args, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Peers),
    );

    const fluenceEnv = await resolveFluenceEnv(args.ENV);

    const relays = resolveRelays(
      fluenceEnv,
      maybeFluenceConfig,
      await getLocalNodes(fluenceEnv),
    );

    commandObj.log(relays.join("\n"));
  }
}
