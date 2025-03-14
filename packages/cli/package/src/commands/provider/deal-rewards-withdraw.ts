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

import { BaseCommand } from "../../baseCommand.js";
import { ptFormatWithSymbol } from "../../lib/chain/currencies.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEAL_IDS_FLAG_NAME,
  PT_SYMBOL,
} from "../../lib/const.js";
import { getContracts, getEventValue, sign } from "../../lib/dealClient.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

const REWARD_WITHDRAWN_EVENT = "RewardWithdrawn";

export default class DealRewardsWithdraw extends BaseCommand<
  typeof DealRewardsWithdraw
> {
  static override hiddenAliases = ["provider:drw"];
  static override description = `Withdraw ${PT_SYMBOL} rewards from deals${aliasesText.apply(this)}`;
  static override flags = {
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
        (await input({
          message: "Enter comma-separated deal ids",
          validate(val: string) {
            return (
              commaSepStrToArr(val).length > 0 ||
              "Please enter at least one deal id"
            );
          },
        })),
    );

    if (dealIds.length === 0) {
      return commandObj.error("No deal ids provided");
    }

    const { contracts } = await getContracts();

    for (const dealId of dealIds) {
      const deal = contracts.getDealV2(dealId);
      const workersIds = await deal.getWorkerIds();

      let providerRewards = 0n;
      let stakerRewards = 0n;

      for (const workerId of workersIds) {
        const rewardAmount = await deal.getRewardAmount(workerId);

        if (
          rewardAmount.providerReward === 0n &&
          rewardAmount.stakerReward === 0n
        ) {
          commandObj.logToStderr(
            `No rewards to withdraw for worker ${workerId}`,
          );

          continue;
        }

        const txReceipt = await sign({
          title: `Withdraw rewards for worker ${workerId}`,
          method: deal.withdrawRewards,
          args: [workerId],
        });

        const providerReward = getEventValue({
          txReceipt,
          contract: deal,
          eventName: REWARD_WITHDRAWN_EVENT,
          value: "providerReward",
        });

        const stakerReward = getEventValue({
          txReceipt,
          contract: deal,
          eventName: REWARD_WITHDRAWN_EVENT,
          value: "stakerReward",
        });

        if (
          typeof providerReward !== "bigint" ||
          typeof stakerReward !== "bigint"
        ) {
          throw new Error(
            `Failed to get rewards amount from event ${REWARD_WITHDRAWN_EVENT}. Please make sure event signature is correct`,
          );
        }

        providerRewards = providerRewards + providerReward;
        stakerRewards = stakerRewards + stakerReward;
      }

      const allRewards = [
        { name: "Provider", val: providerRewards },
        { name: "Staker", val: stakerRewards },
      ].filter(({ val }) => {
        return val > 0n;
      });

      const rewardsStr =
        allRewards.length === 0
          ? "Rewards "
          : `${(
              await Promise.all(
                allRewards.map(async ({ name, val }) => {
                  return `${name} rewards: ${await ptFormatWithSymbol(val)}`;
                }),
              )
            ).join("\n\n")}\n\n`;

      const totalStr =
        allRewards.length > 1
          ? `Total rewards: ${await ptFormatWithSymbol(
              allRewards.reduce((acc, { val }) => {
                return acc + val;
              }, 0n),
            )}\n\n`
          : "";

      commandObj.logToStderr(
        `\n${rewardsStr}${totalStr}were withdrawn from the deal: ${dealId}`,
      );
    }
  }
}
