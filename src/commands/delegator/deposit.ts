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
import { PRIV_KEY_FLAG, ENV_FLAG } from "../../lib/const.js";
import {
  getDealClient,
  promptConfirmTx,
  waitTx,
} from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export default class Deposit extends BaseCommand<typeof Deposit> {
  static override description = "Deposit to capacity commitment";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
  };

  static override args = {
    "CAPACITY_COMMITMENT-ID": Args.string({
      description: "Capacity commitment ID",
    }),
  };

  async run(): Promise<void> {
    const { flags, args } = await initCli(this, await this.parse(Deposit));
    const { dealClient } = await getDealClient();

    const capacity = await dealClient.getCapacity();
    const market = await dealClient.getMarket();
    const flt = await dealClient.getFLT();

    const capacityCommitmentId =
      args["CAPACITY_COMMITMENT-ID"] ??
      (await input({ message: "Enter capacity commitment id" }));

    const commitment = await capacity.getCommitment(capacityCommitmentId);

    const peer = await market.getComputePeer(commitment.peerId);

    const amount = commitment.collateralPerUnit * peer.unitCount;

    promptConfirmTx(flags["priv-key"]);
    const approveTx = await flt.approve(await capacity.getAddress(), amount);
    await waitTx(approveTx);

    promptConfirmTx(flags["priv-key"]);

    const depositTx = await capacity.depositCollateral(capacityCommitmentId);

    await waitTx(depositTx);

    commandObj.log(color.green(`Collateral was deposited`));
  }
}
