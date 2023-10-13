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
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureChainNetwork, getProvider } from "../../lib/provider.js";
import { ethers } from "ethers";

export default class Info extends BaseCommand<typeof Info> {
  static override description = "Get info about provider";
  static override flags = {
    ...baseFlags,
    "provider-address": Flags.string({
      description: "Compute provider address",
      required: true,
    }),
    ...ENV_FLAG,
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Info),
    );

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);
    const { DealClient } = await import("@fluencelabs/deal-aurora");
    // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const dealClient = new DealClient(network, await getProvider(network));
    const globalContracts = dealClient.getGlobalContracts();
    const matcher = await globalContracts.getMatcher();

    const providerAddress = flags["provider-address"];

    const computeProviderInfo =
      await matcher.getComputeProviderInfo(providerAddress);

    commandObj.log(color.gray(`Provider info:`));

    commandObj.log(
      color.gray(
        `Max collateral: ${ethers.formatEther(
          computeProviderInfo.maxCollateral,
        )} FLT`,
      ),
    );

    //TODO: add to units in payment token
    commandObj.log(
      color.gray(
        `Min price per worker per epoch: ${ethers.formatEther(
          computeProviderInfo.minPricePerEpoch,
        )}`,
      ),
    );

    commandObj.log(
      color.gray(`Payment token: ${computeProviderInfo.paymentToken}`),
    );

    commandObj.log(
      color.gray(`Free units: ${computeProviderInfo.totalFreeWorkerSlots}`),
    );

    commandObj.log(color.gray(`--Peers--`));

    const peerIdsAndPeers =
      await matcher.getPeersByComputeProvider(providerAddress);

    if (peerIdsAndPeers[0].length === 0) {
      commandObj.log(color.gray(`No peers`));
    } else {
      for (let i = 0; i < peerIdsAndPeers[0].length; i++) {
        commandObj.log(color.gray(`\nPeer: ${peerIdsAndPeers[0][i]}`));

        const peer = peerIdsAndPeers[1][i];

        if (peer === undefined) {
          continue;
        }

        commandObj.log(
          color.gray(`Free worker slots: ${peer.freeWorkerSlots}`),
        );
      }
    }

    commandObj.log(color.gray(`----------`));
  }
}
