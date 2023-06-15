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

import { DealClient } from "@fluencelabs/deal-client";
import {
  WorkersModule__factory,
  type Matcher,
} from "@fluencelabs/deal-contracts";
import oclifColor from "@oclif/color";
import { Args } from "@oclif/core";

const color = oclifColor.default;

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

const PAT_CREATED_EVENT_TOPIC = "PATCreated";

export default class Match extends BaseCommand<typeof Match> {
  static override hidden = true;
  static override description = "Match deal with resource owners";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
  };

  static override args = {
    "DEAL-ADDRESS": Args.string({
      description: "Deal address",
    }),
  };

  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(Match),
      true
    );

    const dealAddress =
      args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const signer = await getSigner(network, flags.privKey);

    const dealClient = new DealClient(signer, network);

    const globalContracts = dealClient.getGlobalContracts();

    const matcher: Matcher = await globalContracts.getMatcher();

    const tx = await matcher.matchWithDeal(dealAddress);

    promptConfirmTx(flags.privKey);
    const res = await waitTx(tx);

    const workersInterface = WorkersModule__factory.createInterface();

    const event = workersInterface.getEvent(PAT_CREATED_EVENT_TOPIC);

    let patCount = 0;

    for (const log of res.logs) {
      if (log.topics[0] === event.topicHash) {
        const id: unknown = workersInterface.parseLog({
          topics: [...log.topics],
          data: log.data,
        })?.args["id"];

        assert(typeof id === "string");

        patCount = patCount + 1;
      }
    }

    this.log(
      `${color.green(patCount.toString())} workers joined to deal ${color.green(
        dealAddress
      )}`
    );
  }
}
