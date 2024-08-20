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

      await sign({
        title: `Withdraw ${await ptFormatWithSymbol(parsedAmount)} tokens from the deal ${dealName}`,
        method: deal.withdraw,
        args: [parsedAmount],
      });

      commandObj.logToStderr(
        `${formattedAmount} tokens were withdrawn from the deal ${color.yellow(
          dealName,
        )}`,
      );
    }
  }
}
