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

import assert from "node:assert";

import { WorkersModule__factory } from "@fluencelabs/deal-aurora";
import oclifColor from "@oclif/color";
import { Args } from "@oclif/core";
const color = oclifColor.default;

import { BaseCommand, baseFlags } from "../../../baseCommand.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import { input } from "../../../lib/prompt.js";
import {
  Deal,
  GlobalContracts,
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../../lib/provider.js";

const DEAL_ADDRESS_ARG = "DEAL-ADDRESS";
const PAT_CREATED_EVENT_TOPIC = "PATCreated";

export default class CreatePAT extends BaseCommand<typeof CreatePAT> {
  static override description = "Create provider access token for the deal";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
  };
  static override args = {
    [DEAL_ADDRESS_ARG]: Args.string({
      description: "Deal address",
    }),
  };
  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(CreatePAT),
      true
    );

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const dealAddress =
      args[DEAL_ADDRESS_ARG] ??
      (await input({ message: "Enter deal address" }));

    const signer = await getSigner(network, flags.privKey);
    const globalContracts = new GlobalContracts(signer, network);

    const deal = new Deal(dealAddress, signer);
    const config = await deal.getConfig();
    const workersModule = await deal.getWorkers();

    const flt = await globalContracts.getFLT();

    const v = await config.requiredCollateral();
    const approveTx = await flt.approve(dealAddress, v);

    promptConfirmTx(flags.privKey);
    await waitTx(approveTx);

    const joinTx = await workersModule.join();

    promptConfirmTx(flags.privKey);
    const res = await waitTx(joinTx);

    const workersInterface = WorkersModule__factory.createInterface();

    const eventTopic = workersInterface.getEventTopic(PAT_CREATED_EVENT_TOPIC);

    const log = res.logs.find((log: { topics: Array<string> }) => {
      return log.topics[0] === eventTopic;
    });

    assert(log !== undefined);
    const patId: unknown = workersInterface.parseLog(log).args["id"];

    assert(typeof patId === "string");

    this.log(`PAT ID: ${color.yellow(patId)}`);
  }
}
