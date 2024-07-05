/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { randomBytes } from "node:crypto";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { peerIdToUint8Array } from "../../lib/chain/conversions.js";
import { setChainFlags, chainFlags } from "../../lib/chainFlags.js";
import { CHAIN_FLAGS, PRIV_KEY_FLAG_NAME } from "../../lib/const.js";
import { getDealClient, signBatch, populateTx } from "../../lib/dealClient.js";
import { bufferToHex } from "../../lib/helpers/typesafeStringify.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveComputePeersByNames } from "../../lib/resolveComputePeersByNames.js";

export default class Proof extends BaseCommand<typeof Proof> {
  hidden = true;
  static override description = "Send garbage proof for testing purposes";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Proof));
    const computeUnitIds = await resolveComputePeersByNames();

    for (const { peerId, walletKey } of computeUnitIds) {
      setChainFlags({
        ...chainFlags,
        [PRIV_KEY_FLAG_NAME]: walletKey,
      });

      const { dealClient } = await getDealClient();
      const core = dealClient.getCore();
      const capacity = dealClient.getCapacity();
      const difficulty = await core.difficulty();
      const market = dealClient.getMarket();

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

      const localUnitNonce = `0x${bufferToHex(randomBytes(32))}`;

      await signBatch(
        unitIds.map((unitId) => {
          return populateTx(
            capacity.submitProof,
            unitId,
            localUnitNonce,
            difficulty,
          );
        }),
      );
    }
  }
}
