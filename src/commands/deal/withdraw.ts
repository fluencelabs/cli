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
import { ptFormatWithSymbol, ptParse } from "../../lib/chain/currencies.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  CHAIN_FLAGS,
  DEAL_IDS_FLAG,
  DEPLOYMENT_NAMES_ARG,
  PT_SYMBOL,
} from "../../lib/const.js";
import { getDeals } from "../../lib/deal.js";
import { getDealClient, sign } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Withdraw extends BaseCommand<typeof Withdraw> {
  static override description = "Withdraw tokens from the deal";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...DEAL_IDS_FLAG,
  };

  static override args = {
    AMOUNT: Args.string({
      description: `Amount of ${PT_SYMBOL} tokens to withdraw`,
    }),
    ...DEPLOYMENT_NAMES_ARG,
  };

  async run(): Promise<void> {
    const flagsAndArgs = await initCli(this, await this.parse(Withdraw));
    const { dealClient } = await getDealClient();
    const deals = await getDeals(flagsAndArgs);

    const amount =
      flagsAndArgs.args["AMOUNT"] ??
      (await input({
        message: `Enter amount of ${PT_SYMBOL} tokens to withdraw`,
      }));

    const parsedAmount = await ptParse(amount);

    const formattedAmount = color.yellow(
      await ptFormatWithSymbol(parsedAmount),
    );

    for (const { dealId, dealName } of deals) {
      const deal = dealClient.getDeal(dealId);
      await sign(deal.withdraw, parsedAmount);

      commandObj.logToStderr(
        `${formattedAmount} tokens were withdrawn from the deal ${color.yellow(
          dealName,
        )}`,
      );
    }
  }
}
