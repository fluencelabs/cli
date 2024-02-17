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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getDealClient, signBatch } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveAddrsAndPeerIds } from "../../lib/multiaddres.js";

export default class Proof extends BaseCommand<typeof Proof> {
  hidden = true;
  static override description = "Send garbage proof for testing purposes";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(Proof));
    const { dealClient } = await getDealClient();
    const capacity = await dealClient.getCapacity();
    const market = await dealClient.getMarket();

    const computeUnitIds = (
      await Promise.all(
        (await resolveAddrsAndPeerIds()).map(({ peerId }) => {
          return market.getComputeUnitIds(peerId);
        }),
      )
    ).flat();

    const localUnitNonce =
      "0x0000000000000000000000000000000000000000000000000000000000000000"; // random byte32 string

    const difficulty = await capacity.difficulty();

    await signBatch(
      computeUnitIds.map((unitId) => {
        return [capacity.submitProof, unitId, localUnitNonce, difficulty];
      }),
    );
  }
}
