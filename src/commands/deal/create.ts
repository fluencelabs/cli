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

import { BaseCommand } from "../../baseCommand";
import { initCli } from "../../lib/lifecyle";
import {
  getFactoryContract,
  getUSDContract,
  getSigner,
} from "../../lib/provider";
import type { ChainNetwork } from "../../lib/const";

export default class Create extends BaseCommand<typeof Create> {
  static override description =
    "Create your deal with the specified parameters";
  static override flags = {
    privKey: Flags.string({
      char: "k",
      description:
        "Private key with which transactions will be signed through cli",
      required: false,
    }),
    network: Flags.string({
      char: "n",
      description:
        "The network in which the deal will be created (local, testnet, mainnet)",
      required: false,
      default: "local",
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
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Create));

    const network = flags.network as ChainNetwork;

    const signer = await getSigner(network, flags.privKey);
    const factory = getFactoryContract(signer, network);
    const tx = await factory.createDeal(
      utils.keccak256(utils.toUtf8Bytes(flags["subnetId"])), // TODO: base64?
      {
        paymentToken: (await getUSDContract(signer, network)).address,
        pricePerEpoch: BigNumber.from(flags["pricePerEpoch"]).mul(
          BigNumber.from(10).pow(18)
        ),
        requiredStake: BigNumber.from(flags["requiredStake"]).mul(
          BigNumber.from(10).pow(18)
        ),
      }
    );

    const res = await tx.wait();
    const eventTopic = factory.interface.getEventTopic("CreateDeal");
    const log = res.logs.find(({ topics }) => topics[0] === eventTopic);
    assert(log !== undefined);
    const dealAddress: unknown = factory.interface.parseLog(log).args["deal"];
    assert(typeof dealAddress === "string");
    this.log(`Deal contract created: ${dealAddress}`);
  }
}
