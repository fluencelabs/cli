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
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEPLOYMENT_NAMES,
} from "../../lib/const.js";
import { match, getDeals } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Match extends BaseCommand<typeof Match> {
  static override description = "Add missing workers to the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    ...DEPLOYMENT_NAMES,
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Match));
    const deals = await getDeals(flagsAndArgs);

    for (const { dealId } of deals) {
      await match(dealId);
    }
  }
}
