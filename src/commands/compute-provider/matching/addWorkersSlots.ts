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

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { DealClient } from "@fluencelabs/deal-aurora";
import oclifColor from "@oclif/color";
import { Args } from "@oclif/core";
const color = oclifColor.default;
import * as base58 from "multiformats/bases/base58";
import * as digest from "multiformats/hashes/digest";

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

const WORKERS_COUNT = "WORKERS-COUNT";
const PEER_ID = "PEER-ID";

export default class AddWorkerSlots extends BaseCommand<typeof AddWorkerSlots> {
  static override description =
    "Add worker slots to matching contract for peerId";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
  };
  static override args = {
    [PEER_ID]: Args.string({
      description: "PeerId of the workers",
    }),
    [WORKERS_COUNT]: Args.string({
      description: "Workers to be registered with the matching engine",
    }),
  };

  async run(): Promise<void> {
    const { flags, fluenceConfig, args } = await initCli(
      this,
      await this.parse(AddWorkerSlots),
      true
    );

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: fluenceConfig.chainNetwork,
    });

    const workersCount =
      args[WORKERS_COUNT] ?? (await input({ message: "Enter workers count" }));

    const peerId = args[PEER_ID] ?? (await input({ message: "Enter peerId" }));

    const signer = await getSigner(network, flags.privKey);

    const dealClient = new DealClient(signer, network);

    const globalContracts = dealClient.getGlobalContracts();
    const matcher = await globalContracts.getMatcher();
    const flt = await globalContracts.getFLT();
    const factory = globalContracts.getFactory();
    const collateral = await factory.REQUIRED_COLLATERAL();

    const approveTx = await flt.approve(
      await matcher.getAddress(),
      collateral * BigInt(workersCount)
    );

    promptConfirmTx(flags.privKey);
    await waitTx(approveTx);

    const multihash = digest.decode(base58.base58btc.decode("z" + peerId));

    const tx = await matcher.addWorkersSlots(
      multihash.bytes.subarray(4),
      workersCount
    );

    promptConfirmTx(flags.privKey);
    await waitTx(tx);

    this.log(color.green(`Successfully added ${workersCount} worker slots to compute peer ${peerId}`));
  }
}
