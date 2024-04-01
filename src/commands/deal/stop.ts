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

import { color } from "@oclif/color";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  DEAL_IDS_FLAG,
  CHAIN_FLAGS,
  DEPLOYMENT_NAMES_ARG,
} from "../../lib/const.js";
import { getDeals } from "../../lib/deal.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Stop extends BaseCommand<typeof Stop> {
  static override description = "Stop the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    ...DEPLOYMENT_NAMES_ARG,
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Stop), true);
    const deals = await getDeals(flagsAndArgs);
    const { dealClient } = await getDealClient();

    for (const { dealId, dealName } of deals) {
      const deal = dealClient.getDeal(dealId);
      await sign(deal.stop);
      commandObj.logToStderr(`Stopped deal: ${color.yellow(dealName)}`);
    }
  }
}
