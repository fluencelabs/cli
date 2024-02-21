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
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Withdraw extends BaseCommand<typeof Withdraw> {
  static override description = "Withdraw tokens from the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
    AMOUNT: Args.string({
      description: "Amount of tokens to deposit",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(Withdraw));

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const amount =
      args["AMOUNT"] ??
      (await input({ message: "Enter amount of tokens to deposit" }));

    const { dealClient } = await getDealClient();
    const deal = dealClient.getDeal(dealAddress);
    await sign(deal.withdraw, amount);
    color.green(`Tokens were deposited to the deal ${dealAddress}`);
  }
}
