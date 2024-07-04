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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { ptFormatWithSymbol } from "../../lib/chain/currencies.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEAL_IDS_FLAG_NAME,
  PT_SYMBOL,
} from "../../lib/const.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class DealRewardsWithdraw extends BaseCommand<
  typeof DealRewardsWithdraw
> {
  static override aliases = ["provider:drw"];
  static override description = `Withdraw ${PT_SYMBOL} rewards from deals`;
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(
      this,
      await this.parse(DealRewardsWithdraw),
    );

    const dealIds = commaSepStrToArr(
      flags[DEAL_IDS_FLAG_NAME] ??
        (await input({ message: "Enter comma-separated deal ids" })),
    );

    if (dealIds.length === 0) {
      return commandObj.error("Got empty list of deal ids. Aborting");
    }

    const { dealClient } = await getDealClient();

    for (const dealId of dealIds) {
      const deal = dealClient.getDeal(dealId);
      const computeUnits = await deal.getComputeUnits();

      const rewardSum = (
        await Promise.all(
          computeUnits.map(({ id }) => {
            return deal.getRewardAmount(id);
          }),
        )
      ).reduce((acc, reward) => {
        return acc + reward;
      }, 0n);

      for (const { id } of computeUnits) {
        await sign(
          `Withdrawing rewards for compute unit ${id}`,
          deal.withdrawRewards,
          id,
        );
      }

      commandObj.logToStderr(
        `Reward ${color.yellow(
          await ptFormatWithSymbol(rewardSum),
        )} was withdrawn from the deal: ${dealId}`,
      );
    }
  }
}
