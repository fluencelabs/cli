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
  const { dealClient, signerOrWallet } = await getDealClient();

  for (const { dealName, dealId } of deals) {
    const deal = dealClient.getDeal(dealId);

    await sign(
      ERC20__factory.connect(await deal.paymentToken(), signerOrWallet).approve,
      await deal.getAddress(),
      parsedAmount,
    );

    await sign(deal.deposit, parsedAmount);

    commandObj.log(
      `${color.yellow(
        await ptFormatWithSymbol(parsedAmount),
      )} tokens were deposited to the deal ${color.yellow(dealName)}`,
    );
  }
}
