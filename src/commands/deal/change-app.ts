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

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { NETWORK_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifecyle.js";
import { input } from "../../lib/prompt.js";
import {
  getSigner,
  ensureChainNetwork,
  getDealContract,
} from "../../lib/provider.js";

const DEAL_NEW_APP_CID_ARG = "DEAL-NEW-APP-CID";
const DEAL_ADDRESS_ARG = "DEAL-ADDRESS";

export default class ChangeApp extends BaseCommand<typeof ChangeApp> {
  static override description = "Change app id in the deal";
  static override flags = {
    ...baseFlags,
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
    [DEAL_NEW_APP_CID_ARG]: Args.string({
      description: "New app CID for the deal",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(ChangeApp));

    const network = await ensureChainNetwork({
      maybeChainNetwork: flags.network,
    });

    const dealAddress: string =
      args[DEAL_ADDRESS_ARG] ??
      (await input({ message: "Enter deal address" }));

    const newAppCID =
      args[DEAL_NEW_APP_CID_ARG] ??
      (await input({ message: "Enter new app CID" }));

    const signer = await getSigner(network, flags.privKey);
    const deal = getDealContract(dealAddress, signer);

    const tx = await deal.setAppCID(newAppCID);
    await tx.wait();

    this.log(`Tx hash: ${tx.hash}`);
  }
}
