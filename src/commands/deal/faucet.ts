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
import { BigNumber, ContractReceipt } from "ethers";

import { BaseCommand } from "../../baseCommand";
import { initCli } from "../../lib/lifecyle";
import { getDeveloperContract, getSigner } from "../../lib/provider";
import type { ChainNetwork } from "../../lib/const";

const VALUE_ARG = "VALUE";
const TOKEN_ARG = "TOKEN";

export default class Faucet extends BaseCommand<typeof Faucet> {
  static override description =
    "Dev faucet for receiving FLT and FakeUSD tokens";
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
  };

  static override args = [
    {
      name: VALUE_ARG,
      description: "Amount of FLT to receive",
      required: true,
    },
    {
      name: TOKEN_ARG,
      description: "FakeUSD or FLT",
      required: true,
    },
  ];

  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(Faucet));
    const value: unknown = args[VALUE_ARG];
    assert(typeof value === "string");

    const token: unknown = args[TOKEN_ARG];
    assert(typeof token === "string");

    const network = flags.network as ChainNetwork;

    const signer = await getSigner(network, flags.privKey);
    const address = await signer.getAddress();

    const dev = getDeveloperContract(signer, network);

    const v = BigNumber.from(value).mul(BigNumber.from(10).pow(18));

    let tx: ContractReceipt;
    switch (token) {
      case "FLT":
        tx = await (await dev.receiveFLT(address, v)).wait();
        break;
      case "FakeUSD":
        tx = await (await dev.receiveUSD(address, v)).wait();
        break;
      default:
        this.log(`Unknown token: ${token}`);
    }

    this.log(`Tx hash: ${tx!.transactionHash}`);
  }
}
