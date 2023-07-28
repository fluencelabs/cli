/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
import oclifColor from "@oclif/color";
const color = oclifColor.default;

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../../lib/provider.js";

export default class RegisterInMatcher extends BaseCommand<
  typeof RegisterInMatcher
> {
  static override description = "Register in matching contract";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
  };

  async run(): Promise<void> {
    const { flags, fluenceConfig } = await initCli(
      this,
      await this.parse(RegisterInMatcher),
      true
    );

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const signer = await getSigner(network, flags.privKey);

    const dealClient = new DealClient(signer, network);

    const globalContracts = dealClient.getGlobalContracts();

    const matcher = await globalContracts.getMatcher();
    const factory = globalContracts.getFactory();
    const flt = await globalContracts.getFLT();

    const collateral = await factory.REQUIRED_COLLATERAL();
    const pricePerEpoch = await factory.PRICE_PER_EPOCH();

    const tx = await matcher.registerComputeProvider(
      pricePerEpoch,
      collateral,
      await flt.getAddress(),
      []
    );

    promptConfirmTx(flags.privKey);
    await waitTx(tx);

    this.log(color.green(`Successfully joined to matching contract`));
  }
}
