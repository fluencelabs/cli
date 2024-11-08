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

import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { collateralRewardWithdraw } from "../../lib/chain/commitment.js";
import { CC_IDS_FLAG_NAME, CHAIN_FLAGS, FLT_SYMBOL } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class RewardWithdraw extends BaseCommand<typeof RewardWithdraw> {
  static override hiddenAliases = ["delegator:rw"];
  static override description = `Withdraw ${FLT_SYMBOL} rewards from capacity commitment${aliasesText.apply(this)}`;
  static override flags = {
    ...CHAIN_FLAGS,
  };
  static override args = {
    IDS: Args.string({
      description: "Comma separated capacity commitment IDs",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(RewardWithdraw));
    await collateralRewardWithdraw({ [CC_IDS_FLAG_NAME]: args.IDS });
  }
}
