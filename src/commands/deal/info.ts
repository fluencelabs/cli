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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG } from "../../lib/const.js";
import { ensureChainNetwork } from "../../lib/ensureChainNetwork.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { getProvider } from "../../lib/provider.js";

export default class Info extends BaseCommand<typeof Info> {
  static override description = "Get info about provider";
  static override flags = {
    ...baseFlags,
    ...ENV_FLAG,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(Info),
    );

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);

    const dealClient = new DealClient(getProvider(network), network);

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const deal = dealClient.getDeal(dealAddress);

    commandObj.log(color.gray(`Deal info:`));

    const status = await deal.getStatus();

    //TODO: change to enum
    switch (status) {
      case 0n:
        commandObj.log(color.gray(`Status: Inactive`));
        break;
      case 1n:
        commandObj.log(color.gray(`Status: Active`));
        break;
      case 2n:
        commandObj.log(color.gray(`Status: Ended`));
        break;
    }

    commandObj.log(color.gray(`Balance: ${await deal.getFreeBalance()}`));
    const { ethers } = await import("ethers");

    commandObj.log(
      color.gray(
        `Price per worker per epoch: ${ethers.formatEther(
          await deal.pricePerWorkerEpoch(),
        )}`,
      ),
    );

    commandObj.log(color.gray(`Payment token: ${await deal.paymentToken()}`));

    commandObj.log(color.gray(`Min workers: ${await deal.minWorkers()}`));

    commandObj.log(color.gray(`Target worker: ${await deal.targetWorkers()}`));

    const currentComputeUnitCount = await deal.getComputeUnitCount();

    commandObj.log(
      color.gray(`Current compute units: ${currentComputeUnitCount}`),
    );

    commandObj.log(color.gray(`--Compute Units--`));

    if (currentComputeUnitCount === 0n) {
      commandObj.log(color.gray(`No compute units`));
    } else {
      const computeUnits = await deal.getComputeUnits();

      for (const unit of computeUnits) {
        commandObj.log(color.gray(`\nCompute unit: ${unit.id}`));
        commandObj.log(color.gray(`Provider: ${unit.provider}`));

        if (unit.workerId === ethers.ZeroHash) {
          commandObj.log(color.gray(`Worker Id: None`));
        } else {
          commandObj.log(color.gray(`Worker Id: ${unit.workerId}`));
        }

        commandObj.log(color.gray(`Peer Id: ${unit.peerId}`));
      }
    }
  }
}
