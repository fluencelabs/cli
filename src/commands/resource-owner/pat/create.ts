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
  getSigner,
} from "../../../lib/provider";
import type { ChainNetwork } from "../../../lib/const";

const DEAL_ADDRESS_ARG = "DEAL-ADDRESS";

export default class CreatePAT extends BaseCommand<typeof CreatePAT> {
  static override description =
    "Create PAT (Peer auth token) in a deal for auth";
  static override flags = {
    privKey: Flags.string({
      char: "k",
      description:
        "Private key with which transactions will be signed through cli",
      required: false,
    }),
    network: Flags.string({
      char: "n",
      description:
        "The network in which the deal will be created (local, testnet, mainnet)",
      required: false,
      default: "local",
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

    const network = flags.network as ChainNetwork;

    const dealAddress: unknown = args[DEAL_ADDRESS_ARG];
    assert(typeof dealAddress === "string");

    const signer = await getSigner(network, flags.privKey);
    const deal = getDealContract(dealAddress, signer);
    const flt = await getFLTContract(signer, network);

    const v = (await deal.settings()).requiredStake;
    const approveTx = await flt.approve(dealAddress, v);

    if ((await deal.getRole(await signer.getAddress())) === 0) {
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
