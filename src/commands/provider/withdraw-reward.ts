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
import { PRIV_KEY_FLAG, ENV_FLAG } from "../../lib/const.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class WithdrawReward extends BaseCommand<typeof WithdrawReward> {
  static override description = "Withdraw reward";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
    "UNIT-ID": Args.string({
      description: "Compute unit CID",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(WithdrawReward));

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const unitId =
      args["UNIT-ID"] ?? (await input({ message: "Enter unit CID" }));

    const { dealClient } = await getDealClient();
    const deal = dealClient.getDeal(dealAddress);
    const rewardAmount = await deal.getRewardAmount(unitId);
    await sign(deal.withdrawRewards, unitId);
    const { ethers } = await import("ethers");

    commandObj.logToStderr(
      `Reward ${color.yellow(
        ethers.formatEther(rewardAmount),
      )} was withdrawn from the deal ${dealAddress}`,
    );
  }
}
