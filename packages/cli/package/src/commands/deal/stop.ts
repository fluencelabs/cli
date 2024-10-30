/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { color } from "@oclif/color";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  DEAL_IDS_FLAG,
  CHAIN_FLAGS,
  DEPLOYMENT_NAMES_ARG,
} from "../../lib/const.js";
import { getDeals } from "../../lib/deal.js";
import { getContracts, sign } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Stop extends BaseCommand<typeof Stop> {
  static override description = "Stop the deal";
  static override flags = {
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    ...DEPLOYMENT_NAMES_ARG,
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Stop), true);
    const deals = await getDeals(flagsAndArgs);
    const { contracts } = await getContracts();

    for (const { dealId, dealName } of deals) {
      const deal = contracts.getDeal(dealId);

      await sign({
        title: `Stop the deal ${dealName} (${dealId})`,
        method: deal.stop,
        args: [],
      });

      commandObj.logToStderr(`Stopped deal: ${color.yellow(dealName)}`);
    }
  }
}
