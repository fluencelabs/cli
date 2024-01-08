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

import { ERC20__factory } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { PRIV_KEY_FLAG, ENV_FLAG } from "../../lib/const.js";
import {
  getDealClient,
  promptConfirmTx,
  waitTx,
} from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Deposit extends BaseCommand<typeof Deposit> {
  static override description = "Deposit do the deal";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
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
    const { flags, args } = await initCli(this, await this.parse(Deposit));
    const privKey = flags["priv-key"];

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const { ethers } = await import("ethers");

    const amount = ethers.parseEther(
      args["AMOUNT"] ??
        (await input({ message: "Enter amount of tokens to deposit" })),
    );

    const { dealClient, signerOrWallet } = await getDealClient();
    const deal = dealClient.getDeal(dealAddress);

    promptConfirmTx(privKey);

    const approveTx = await ERC20__factory.connect(
      await deal.paymentToken(),
      signerOrWallet,
    ).approve(await deal.getAddress(), amount);

    await approveTx.wait();

    promptConfirmTx(privKey);

    const tx = await deal.deposit(amount);

    await waitTx(tx);

    color.green(`Tokens were deposited to the deal ${dealAddress}`);
  }
}
