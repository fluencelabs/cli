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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../lib/const.js";
import { dealCreate } from "../../lib/deal.js";
import { initCli } from "../../lib/lifecyle.js";
import { ensureChainNetwork } from "../../lib/provider.js";

export default class Create extends BaseCommand<typeof Create> {
  static override description =
    "Create your deal with the specified parameters";
  static override flags = {
    ...baseFlags,
    appCID: Flags.string({
      description: "CID of the application that will be deployed",
      required: true,
    }),
    minWorkers: Flags.integer({
      description: "Required workers to activate the deal",
      default: 1,
    }),
    targetWorkers: Flags.integer({
      description: "Max workers in the deal",
      default: 3,
    }),
    ...NETWORK_FLAG,
    ...PRIV_KEY_FLAG,
  };

  async run(): Promise<void> {
    const { flags, fluenceConfig } = await initCli(
      this,
      await this.parse(Create),
      true
    );

    const dealAddress = await dealCreate({
      ...flags,
      chainNetwork: await ensureChainNetwork({
        maybeNetworkFromFlags: flags.network,
        maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
      }),
    });

    commandObj.log(`Deal contract created: ${dealAddress}`);
  }
}
