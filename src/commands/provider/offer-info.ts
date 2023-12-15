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

import { DealClient } from "@fluencelabs/deal-aurora";
import { color } from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureChainNetwork, getProvider } from "../../lib/provider.js";

export default class OfferInfo extends BaseCommand<typeof OfferInfo> {
  static override description = "Get info about provider";
  static override flags = {
    ...baseFlags,
    "offer-id": Flags.string({
      description: "Offer ID",
      required: true,
    }),
    ...ENV_FLAG,
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(OfferInfo),
    );

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);

    const dealClient = new DealClient(getProvider(network), network);
    const market = await dealClient.getMarket();

    const offerId = flags["offer-id"];

    const offerInfo = await market.getOffer(offerId);

    commandObj.log(color.gray(`Offer Info:`));
    const { ethers } = await import("ethers");

    commandObj.log(color.gray(`Provider address: ${offerInfo.provider}`));

    //TODO: add to units in payment token
    commandObj.log(
      color.gray(
        `Min price per worker per epoch: ${ethers.formatEther(
          offerInfo.minPricePerWorkerEpoch,
        )}`,
      ),
    );

    commandObj.log(color.gray(`Payment token: ${offerInfo.paymentToken}`));

    commandObj.log(color.gray(`--Peers--`));

    //TODO: get peers from indexer
    commandObj.log(color.gray(`Sorry, this not implemented yet`));

    commandObj.log(color.gray(`----------`));
  }
}
