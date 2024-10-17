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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { collateralRewardWithdraw } from "../../lib/chain/commitment.js";
import { CHAIN_FLAGS, FLT_SYMBOL, CC_FLAGS } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CCRewardsWithdraw extends BaseCommand<
  typeof CCRewardsWithdraw
> {
  static override aliases = ["provider:crw"];
  static override description = `Withdraw ${FLT_SYMBOL} rewards from capacity commitments`;
  static override flags = {
    ...baseFlags,
    ...CC_FLAGS,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CCRewardsWithdraw));
    await collateralRewardWithdraw(flags);
  }
}
