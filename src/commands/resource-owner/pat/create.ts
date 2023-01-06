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

import { BaseCommand } from "../../../baseCommand";
import { initCli } from "../../../lib/lifecyle";
import {
  getDealContract,
  getFLTContract,
  getWallet,
} from "../../../lib/provider";

const DEAL_ADDRESS_ARG = "DEAL-ADDRESS";

export default class CreatePAT extends BaseCommand<typeof CreatePAT> {
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
      name: DEAL_ADDRESS_ARG,
      description: "Deal address",
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(CreatePAT));

    const dealAddress: unknown = args[DEAL_ADDRESS_ARG];
    assert(typeof dealAddress === "string");

    const wallet = getWallet(flags.privKey);
    const deal = getDealContract(dealAddress, wallet);
    const flt = await getFLTContract(wallet);

    const v = (await deal.settings()).requiredStake;
    const approveTx = await flt.approve(dealAddress, v);

    if ((await deal.getRole(wallet.address)) === 0) {
      await (await deal.register()).wait();
    }

    await (await deal.deposit(flt.address, v)).wait();
    const res = await (await deal.addProviderToken(approveTx.hash)).wait();

    const eventTopic = deal.interface.getEventTopic("AddProviderToken");
    const log = res.logs.find(({ topics }) => topics[0] === eventTopic);
    assert(log !== undefined);
    const patId: unknown = deal.interface.parseLog(log).args["id"];
    assert(typeof patId === "string");

    this.log(`PAT ID: ${patId}`);
  }
}
