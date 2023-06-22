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

import { assert } from "console";

import { DealClient } from "@fluencelabs/deal-contracts";
import oclifColor from "@oclif/color";
import { Args } from "@oclif/core";
import ethers = require("ethers");
const color = oclifColor.default;

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import { input } from "../../../lib/prompt.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../../lib/provider.js";

const RESOURCE_OWNER = "RESOURCE-OWNER";
const IS_ADD_ACCESS = "IS_ADD_ACCESS";

export default class SetAccess extends BaseCommand<typeof SetAccess> {
  static override description = "Set access to resource owner";
  static override hidden = true;

  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
  };
  static override args = {
    [RESOURCE_OWNER]: Args.string({
      description: "EVM address of resource owner",
    }),
    [IS_ADD_ACCESS]: Args.string({
      description: "Add or remove access (true or false)",
    }),
  };

  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(SetAccess),
      true
    );

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const resourceOwner =
      args[RESOURCE_OWNER] ??
      (await input({ message: "Enter EVM address of resource owner" }));

    const isAddAccess =
      args[IS_ADD_ACCESS] ??
      (await input({ message: "Add or remove access. (true or false)" }));

    assert(
      isAddAccess == "true" || isAddAccess == "false",
      "Invalid input. Add or remove access. (true or false)"
    );

    assert(
      ethers.isAddress(resourceOwner),
      "Invalid input. Enter EVM address of resource owner"
    );

    const signer = await getSigner(network, flags.privKey);
    const dealClient = new DealClient(signer, network);

    const globalContracts = dealClient.getGlobalContracts();

    const matcher = await globalContracts.getMatcher();

    const tx = await matcher.setWhiteList(resourceOwner, isAddAccess == "true");

    promptConfirmTx(flags.privKey);
    await waitTx(tx);

    this.log(
      color.green("Successfully set access to resource owner: " + resourceOwner)
    );
  }
}
