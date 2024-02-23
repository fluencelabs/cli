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

import { commandObj } from "../commandObj.js";
import { CURRENCY_MULTIPLIER } from "../const.js";
import { getDeals } from "../deal.js";
import { getDealClient, sign } from "../dealClient.js";

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
  const parsedAmount = BigInt(Number(amount) * CURRENCY_MULTIPLIER);
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
      `${color.yellow(amount)} tokens were deposited to the deal ${color.yellow(
        dealName,
      )}`,
    );
  }
}
