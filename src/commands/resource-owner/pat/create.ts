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

import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../../../baseCommand";
import { NETWORK_FLAG } from "../../../lib/const";
import { initCli } from "../../../lib/lifecyle";
import { input } from "../../../lib/prompt";
import {
  ensureChainNetwork,
  getDealContract,
  getFLTContract,
  getSigner,
} from "../../../lib/provider";

const DEAL_ADDRESS_ARG = "DEAL-ADDRESS";
const ADD_PROVIDER_TOKEN_EVENT_TOPIC = "AddProviderToken";

export default class CreatePAT extends BaseCommand<typeof CreatePAT> {
  static override hidden = true;
  static override description =
    "Create PAT (Peer auth token) in a deal for auth";
  static override flags = {
    privKey: Flags.string({
      char: "k",
      description:
        "Private key with which transactions will be signed through cli",
      required: false,
    }),
    ...NETWORK_FLAG,
  };
  static override args = {
    [DEAL_ADDRESS_ARG]: Args.string({
      description: "Deal address",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, commandObj, isInteractive } = await initCli(
      this,
      await this.parse(CreatePAT)
    );

    const network = await ensureChainNetwork({
      commandObj,
      isInteractive,
      maybeChainNetwork: flags.network,
    });

    const dealAddress =
      args[DEAL_ADDRESS_ARG] ??
      (await input({ isInteractive, message: "Enter deal address" }));

    const signer = await getSigner(network, flags.privKey, commandObj);
    const deal = getDealContract(dealAddress, signer);
    const flt = await getFLTContract(signer, network);

    const v = await deal.requiredStake();
    const approveTx = await flt.approve(dealAddress, v);
    const signerAddress = await signer.getAddress();
    const dealRole = await deal.getRole(signerAddress);

    if (dealRole === 0) {
      await (await deal.register()).wait();
    }

    const res = await (await deal.createProviderToken(approveTx.hash)).wait();

    const eventTopic = deal.interface.getEventTopic(
      ADD_PROVIDER_TOKEN_EVENT_TOPIC
    );

    const log = res.logs.find(
      (log: { topics: Array<any> }) => log.topics[0] === eventTopic
    );
    assert(log !== undefined);
    const patId: unknown = deal.interface.parseLog(log).args["id"];
    assert(typeof patId === "string");

    this.log(`PAT ID: ${patId}`);
  }
}
