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
import { PRIV_KEY_FLAG, ENV_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

export default class RemoveUnit extends BaseCommand<typeof RemoveUnit> {
  static override description = "Remove unit from the deal";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
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
    const { flags, maybeFluenceConfig, args } = await initCli(
      this,
      await this.parse(RemoveUnit),
    );

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);
    const privKey = flags["priv-key"];

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const signer = await getSigner(network, privKey);
    const { DealClient } = await import("@fluencelabs/deal-aurora");
    // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const dealClient = new DealClient(network, signer);
    const deal = dealClient.getDeal(dealAddress);

    promptConfirmTx(privKey);

    const tx = await deal.removeComputeUnit(
      args["UNIT-ID"] ?? (await input({ message: "Enter compute unit CID" })),
    );

    // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    await waitTx(tx);

    color.green(
      `Unit ${args["UNIT-ID"]} was removed from the deal ${dealAddress}`,
    );
  }
}
