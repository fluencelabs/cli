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
import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureChainNetwork, getProvider } from "../../lib/provider.js";
import { input } from "../../lib/prompt.js";

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
    "UNIT-ID": Args.string({
      description: "Compute unit CID",
    }),
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

    const dealAddress =
      this.args["DEAL-ADDRESS"] ??
      (await input({ message: "Enter deal address" }));

    const deal = dealClient.getDeal(dealAddress);

    commandObj.log(color.gray(`Deal info:`));

    commandObj.log(color.gray(`Status: ${await deal.getStatus()}`));

    commandObj.log(color.gray(`Balance: ${await deal.getFreeBalance()}`));

    commandObj.log(
      color.gray(`Collateral per worker: ${await deal.collateralPerWorker()}`),
    );

    commandObj.log(
      color.gray(
        `Price per worker per epoch: ${await deal.pricePerWorkerEpoch()}`,
      ),
    );

    commandObj.log(color.gray(`Payment token: ${await deal.paymentToken()}`));

    commandObj.log(color.gray(`Min workers: ${await deal.minWorkers()}`));

    commandObj.log(color.gray(`Target worker: ${await deal.targetWorkers()}`));

    commandObj.log(
      color.gray(`Current compute units: ${await deal.getComputeUnitCount()}`),
    );

    commandObj.log(color.gray(`--Compute Units--`));

    const computeUnits = await deal.getComputeUnits();

    for (const unit of computeUnits) {
      commandObj.log(color.gray(`Compute unit: ${unit.id}`));

      commandObj.log(color.gray(`WorkerId: ${unit.workerId}`));

      commandObj.log(color.gray(`Worker slot: ${unit.peerId}`));

      commandObj.log(color.gray(`Owner: ${unit.owner}`));
    }
  }
}
