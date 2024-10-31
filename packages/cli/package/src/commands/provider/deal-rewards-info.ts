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
import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { ptFormatWithSymbol } from "../../lib/chain/currencies.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getReadonlyContracts } from "../../lib/dealClient.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class DealRewardsInfo extends BaseCommand<
  typeof DealRewardsInfo
> {
  static override hiddenAliases = ["provider:dri"];
  static override description = `Deal rewards info${aliasesText.apply(this)}`;
  static override flags = {
    ...CHAIN_FLAGS,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
    "ON-CHAIN-WORKER-ID": Args.string({
      description: "On-chain worker id",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(DealRewardsInfo));

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const onChainWorkerId =
      args["ON-CHAIN-WORKER-ID"] ??
      (await input({ message: "Enter on-chain worker id" }));

    const { readonlyContracts } = await getReadonlyContracts();
    const deal = readonlyContracts.getDeal(dealAddress);
    const rewardAmount = await deal.getRewardAmount(onChainWorkerId);

    commandObj.log(
      `Provider reward: ${color.yellow(
        await ptFormatWithSymbol(rewardAmount.providerReward),
      )}\n\nStaker reward: ${color.yellow(
        await ptFormatWithSymbol(rewardAmount.stakerReward),
      )}`,
    );
  }
}
