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

import { randomBytes } from "node:crypto";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { peerIdToUint8Array } from "../../lib/chain/conversions.js";
import { setChainFlags, chainFlags } from "../../lib/chainFlags.js";
import { resolveComputePeersByNames } from "../../lib/configs/project/provider.js";
import { CHAIN_FLAGS, PRIV_KEY_FLAG_NAME } from "../../lib/const.js";
import { getDealClient, signBatch } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Proof extends BaseCommand<typeof Proof> {
  hidden = true;
  static override description = "Send garbage proof for testing purposes";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Proof));

    const computeUnitIds = (await resolveComputePeersByNames()).map(
      ({ peerId, walletKey }) => {
        return {
          peerId,
          walletKey,
        };
      },
    );

    for (const { peerId, walletKey } of computeUnitIds) {
      setChainFlags({
        ...chainFlags,
        [PRIV_KEY_FLAG_NAME]: walletKey,
      });

      const { dealClient } = await getDealClient();
      const capacity = await dealClient.getCapacity();
      const difficulty = await capacity.difficulty();
      const market = await dealClient.getMarket();

      const unitIds = await market.getComputeUnitIds(
        await peerIdToUint8Array(peerId),
      );

      // for (const unitId of unitIds) {
      //   const localUnitNonce = `0x${randomBytes(32).toString("hex")}`;

      //   await sign(
      //     capacity.submitProof,
      //     unitId,
      //     localUnitNonce,
      //     difficulty,
      //   );
      // }

      const localUnitNonce = `0x${randomBytes(32).toString("hex")}`;

      await signBatch(
        unitIds.map((unitId) => {
          return [capacity.submitProof, unitId, localUnitNonce, difficulty];
        }),
      );
    }
  }
}
