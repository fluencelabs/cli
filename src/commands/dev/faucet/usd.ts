/**
 * Copyright 2022 Fluence Labs Limited
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

import assert from "node:assert";

import { Flags } from "@oclif/core";
import { BigNumber } from "ethers";

import { BaseCommand } from "../../../baseCommand";
import { initCli } from "../../../lib/lifecyle";
import { getDeveloperContract, getWallet } from "../../../lib/provider";

const VALUE_ARG = "VALUE";

export default class USD extends BaseCommand<typeof USD> {
  static override description = "TODO: description";
  static override flags = {
    privKey: Flags.string({
      char: "k",
      description: "Your private key",
      required: true,
    }),
  };

  static override args = [
    {
      name: VALUE_ARG,
      description: "Amount of USD to receive",
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(USD));

    const value: unknown = args[VALUE_ARG];
    assert(typeof value === "string");

    const wallet = getWallet(flags.privKey);
    const dev = getDeveloperContract(wallet);

    const v = BigNumber.from(value).mul(BigNumber.from(10).pow(18));
    const tx = await (await dev.receiveUSD(wallet.address, v)).wait();

    this.log(`Tx hash: ${tx.transactionHash}`);
  }
}
