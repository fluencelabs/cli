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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { ptFormatWithSymbol } from "../../lib/chain/currencies.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getReadonlyDealClient } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class DealRewardsInfo extends BaseCommand<
  typeof DealRewardsInfo
> {
  static override aliases = ["provider:dri"];
  static override description = "Deal rewards info";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
    "UNIT-ID": Args.string({
      description: "Compute unit ID",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(DealRewardsInfo));

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const unitId =
      args["UNIT-ID"] ?? (await input({ message: "Enter unit id" }));

    const { readonlyDealClient } = await getReadonlyDealClient();
    const deal = readonlyDealClient.getDeal(dealAddress);
    const rewardAmount = await deal.getRewardAmount(unitId);

    commandObj.log(
      `Deal reward amount: ${color.yellow(
        await ptFormatWithSymbol(rewardAmount),
      )}`,
    );
  }
}
