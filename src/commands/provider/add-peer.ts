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
import { PROVIDER_CONFIG_FLAGS, PRIV_KEY_FLAG } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { getResolvedProviderConfig } from "../../lib/multiaddres.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

const DEFAULT_NUMBER_OF_COMPUTE_UNITS = 1;

export default class AddPeer extends BaseCommand<typeof AddPeer> {
  static override description =
    "Register specific nox instance as a Compute Peer";
  static override flags = {
    ...baseFlags,
    ...PRIV_KEY_FLAG,
    ...PROVIDER_CONFIG_FLAGS,
    "peer-id": Flags.string({
      description: "Peer id of the compute peer",
      multiple: true,
    }),
    "compute-units": Flags.integer({
      description: "Number of compute units to add for each peer",
      multiple: true,
    }),
  };

  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(AddPeer),
    );

    const defaultNumberOfComputeUnits =
      flags["compute-units"]?.[0] ?? DEFAULT_NUMBER_OF_COMPUTE_UNITS;

    const network = await ensureChainNetwork(flags.env, maybeFluenceConfig);

    const peerIds =
      flags["peer-id"] !== undefined && flags["peer-id"].length !== 0
        ? flags["peer-id"].map((peerId, i) => {
            return {
              peerId,
              computeUnits:
                flags["compute-units"]?.[i] ?? defaultNumberOfComputeUnits,
            };
          })
        : await getResolvedProviderConfig(flags);

    const [{ DealClient }, { digest }, { base58btc }] = await Promise.all([
      import("@fluencelabs/deal-aurora"),
      import("multiformats"),
      // eslint-disable-next-line import/extensions
      import("multiformats/bases/base58"),
    ]);

    for (const { peerId, computeUnits } of peerIds) {
      const signer = await getSigner(network, flags["priv-key"]);
      // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
      const dealClient = new DealClient(network, signer);
      const globalContracts = dealClient.getGlobalContracts();
      const matcher = await globalContracts.getMatcher();
      const flt = await globalContracts.getFLT();

      const collateral = (
        await matcher.getComputeProviderInfo(await signer.getAddress())
      ).maxCollateral;

      const approveTx = await flt.approve(
        await matcher.getAddress(),
        collateral * BigInt(computeUnits),
      );

      promptConfirmTx(flags["priv-key"]);
      // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
      await waitTx(approveTx);

      const multihash = digest.decode(base58btc.decode("z" + peerId));
      const bytes = multihash.bytes.subarray(6);
      const tx = await matcher.addWorkersSlots(bytes, computeUnits);
      promptConfirmTx(flags["priv-key"]);
      // @ts-expect-error remove when @fluencelabs/deal-aurora is migrated to ESModules
      await waitTx(tx);

      const free = (await matcher.getComputePeerInfo(bytes)).freeWorkerSlots;

      commandObj.logToStderr(
        `Added ${color.yellow(
          computeUnits,
        )} worker slots. Compute peer ${color.yellow(
          peerId,
        )} has ${color.yellow(free)} free worker slots now.`,
      );
    }
  }
}
