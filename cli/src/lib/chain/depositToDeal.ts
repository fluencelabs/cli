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

import { commandObj } from "../commandObj.js";
import { getDeals } from "../deal.js";
import { getDealClient, sign } from "../dealClient.js";

import { ptFormatWithSymbol, ptParse } from "./currencies.js";

export async function depositToDeal(
  flagsAndArgs: {
    args: {
      "DEPLOYMENT-NAMES": string | undefined;
    };
    flags: {
      "deal-ids": string | undefined;
    };
  },
  amount: string,
) {
  const parsedAmount = await ptParse(amount);
  const deals = await getDeals(flagsAndArgs);
  const { ERC20__factory } = await import("@fluencelabs/deal-ts-clients");

  const { dealClient, providerOrWallet } = await getDealClient();

  for (const { dealName, dealId } of deals) {
    const deal = dealClient.getDeal(dealId);
    const tokensString = await ptFormatWithSymbol(parsedAmount);

    await sign({
      title: `Approve ${tokensString} tokens to be deposited to the deal ${dealName}`,
      method: ERC20__factory.connect(
        await deal.paymentToken(),
        providerOrWallet,
      ).approve,
      args: [await deal.getAddress(), parsedAmount],
    });

    await sign({
      title: `Deposit ${tokensString} to the deal ${dealName} (${dealId})`,
      method: deal.deposit,
      args: [parsedAmount],
    });

    commandObj.log(
      `${color.yellow(
        tokensString,
      )} tokens were deposited to the deal ${color.yellow(dealName)}`,
    );
  }
}
