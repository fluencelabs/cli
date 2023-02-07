/**
 * Copyright 2022 Fluence Labs Limited
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

import { Flags } from "@oclif/core";
import { BigNumber, utils } from "ethers";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { NETWORK_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifecyle.js";
import {
  getFactoryContract,
  getUSDContract,
  getSigner,
  ensureChainNetwork,
} from "../../lib/provider.js";

const EVENT_TOPIC_FRAGMENT = "CreateDeal";
const DEAL_LOG_ARG_NAME = "deal";

export default class Create extends BaseCommand<typeof Create> {
  static override description =
    "Create your deal with the specified parameters";
  static override flags = {
    ...baseFlags,
    privKey: Flags.string({
      char: "k",
      description:
        "Private key with which transactions will be signed through cli",
      required: false,
    }),
    subnetId: Flags.string({
      description: "Subnet ID for a deal",
      required: true,
    }),
    pricePerEpoch: Flags.string({
      description: "The price that you will pay to resource owners per epoch",
      required: true,
    }),
    requiredStake: Flags.string({
      description:
        "Required collateral in FLT tokens to join a deal for resource owners.",
      required: true,
    }),
    ...NETWORK_FLAG,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Create));

    const network = await ensureChainNetwork({
      maybeChainNetwork: flags.network,
    });

    const signer = await getSigner(network, flags.privKey);
    const factory = getFactoryContract(signer, network);

    const tx = await factory.createDeal(
      utils.keccak256(utils.toUtf8Bytes(flags.subnetId)), // TODO: base64?
      (
        await getUSDContract(signer, network)
      ).address,
      BigNumber.from(flags.pricePerEpoch).mul(BigNumber.from(10).pow(18)),
      BigNumber.from(flags.requiredStake).mul(BigNumber.from(10).pow(18))
    );

    const res = await tx.wait();
    const eventTopic = factory.interface.getEventTopic(EVENT_TOPIC_FRAGMENT);

    const log = res.logs.find(
      (log: { topics: Array<string> }) => log.topics[0] === eventTopic
    );

    assert(log !== undefined);

    const dealAddress: unknown =
      factory.interface.parseLog(log).args[DEAL_LOG_ARG_NAME];

    assert(typeof dealAddress === "string");
    this.log(`Deal contract created: ${dealAddress}`);
  }
}
