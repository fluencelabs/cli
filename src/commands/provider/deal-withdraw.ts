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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { commaSepStrToArr } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class DealWithdraw extends BaseCommand<typeof DealWithdraw> {
  static override aliases = ["provider:dw"];
  static override description = "Withdraw rewards from deals";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  static override args = {
    "DEAL-IDS": Args.string({
      description: "Deal ids",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(DealWithdraw));

    const dealIds = commaSepStrToArr(
      args["DEAL-IDS"] ??
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

      const { ethers } = await import("ethers");

      commandObj.logToStderr(
        `Reward ${color.yellow(
          ethers.formatEther(rewardSum),
        )} was withdrawn from the deal: ${dealId}`,
      );
    }
  }
}
