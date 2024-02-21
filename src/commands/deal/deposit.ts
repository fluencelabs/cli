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
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEPLOYMENT_NAMES,
} from "../../lib/const.js";
import { getDeals } from "../../lib/deal.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Deposit extends BaseCommand<typeof Deposit> {
  static override description = "Deposit do the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    ...DEPLOYMENT_NAMES,
    AMOUNT: Args.string({
      description: "Amount of tokens to deposit",
    }),
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Deposit));

    const { ethers } = await import("ethers");

    const amount =
      flagsAndArgs.args["AMOUNT"] ??
      (await input({ message: "Enter amount of tokens to deposit" }));

    const parsedAmount = ethers.parseEther(amount);
    const deals = await getDeals(flagsAndArgs);

    for (const { dealName, dealId } of deals) {
      const { dealClient, signerOrWallet } = await getDealClient();
      const deal = dealClient.getDeal(dealId);
      const { ERC20__factory } = await import("@fluencelabs/deal-ts-clients");

      await sign(
        ERC20__factory.connect(await deal.paymentToken(), signerOrWallet)
          .approve,
        await deal.getAddress(),
        parsedAmount,
      );

      await sign(deal.deposit, parsedAmount);

      commandObj.log(
        `${color.yellow(
          amount,
        )} tokens were deposited to the deal ${color.yellow(dealName)}`,
      );
    }
  }
}
