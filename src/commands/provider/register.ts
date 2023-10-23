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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { ENV_FLAG, PRIV_KEY_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

export default class Register extends BaseCommand<typeof Register> {
  static override description = "Register in matching contract";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...ENV_FLAG,
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Register),
    );

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);
    const signer = await getSigner(network, flags["priv-key"]);
    const { DealClient } = await import("@fluencelabs/deal-aurora");
    // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
    const dealClient = new DealClient(signer, network);
    const globalContracts = dealClient.getGlobalContracts();
    const matcher = await globalContracts.getMatcher();
    const factory = await globalContracts.getFactory();
    const flt = await globalContracts.getFLT();
    const collateral = await factory.REQUIRED_COLLATERAL();
    const pricePerEpoch = await factory.PRICE_PER_EPOCH();

    const tx = await matcher.registerComputeProvider(
      pricePerEpoch,
      collateral,
      await flt.getAddress(),
      [],
    );

    promptConfirmTx(flags["priv-key"]);
    // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
    await waitTx(tx);

    commandObj.log(color.green(`Successfully joined to matching contract`));
  }
}
