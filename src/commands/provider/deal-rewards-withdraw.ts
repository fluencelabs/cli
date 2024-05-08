/**
 * Copyright 2024 Fluence DAO
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
        await sign(deal.withdrawRewards, id);
      }

      commandObj.logToStderr(
        `Reward ${color.yellow(
          await ptFormatWithSymbol(rewardSum),
        )} was withdrawn from the deal: ${dealId}`,
      );
    }
  }
}
