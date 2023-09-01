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
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { NETWORK_FLAG, PRIV_KEY_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

export default class AddPeer extends BaseCommand<typeof AddPeer> {
  static override description =
    "Register specific nox instance as a Compute Peer";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...NETWORK_FLAG,
    "peer-id": Flags.string({
      description:
        "Peer id of the nox instance that you want to register as a Compute Peer",
      helpValue: "<peer-id>",
      multiple: true,
    }),
    units: Flags.string({
      description: "Number of available worker units on this Compute Peer",
      helpValue: "<number>",
    }),
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(AddPeer),
    );

    const network = await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: maybeFluenceConfig?.chainNetwork,
    });

    const workersCount =
      flags.units ?? (await input({ message: "Enter workers count" }));

    const peerIds = flags["peer-id"] ?? [
      await input({ message: "Enter peerId" }),
    ];

    const [{ DealClient }, { digest }, { base58btc }] = await Promise.all([
      import("@fluencelabs/deal-aurora"),
      import("multiformats"),
      // eslint-disable-next-line import/extensions
      import("multiformats/bases/base58"),
    ]);

    for (const peerId of peerIds) {
      const signer = await getSigner(network, flags["priv-key"]);
      // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const dealClient = new DealClient(signer, network);
      const globalContracts = dealClient.getGlobalContracts();
      const matcher = await globalContracts.getMatcher();
      const flt = await globalContracts.getFLT();
      const factory = await globalContracts.getFactory();
      const collateral = await factory.REQUIRED_COLLATERAL();

      const approveTx = await flt.approve(
        await matcher.getAddress(),
        collateral * BigInt(workersCount),
      );

      promptConfirmTx(flags["priv-key"]);
      // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await waitTx(approveTx);

      const multihash = digest.decode(base58btc.decode("z" + peerId));
      const bytes = multihash.bytes.subarray(6);
      const tx = await matcher.addWorkersSlots(bytes, workersCount);
      promptConfirmTx(flags["priv-key"]);
      // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      await waitTx(tx);
      const free = await matcher.getFreeWorkersSolts(bytes);

      commandObj.logToStderr(
        `Added ${color.yellow(
          workersCount,
        )} worker slots. Compute peer ${color.yellow(
          peerIds,
        )} has ${color.yellow(free)} free worker slots now.`,
      );
    }
  }
}
