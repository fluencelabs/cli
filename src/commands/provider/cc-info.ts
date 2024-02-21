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
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS } from "../../lib/const.js";
import { getDealClient } from "../../lib/dealClient.js";
import { jsonStringify } from "../../lib/helpers/utils.js";
import { initCli } from "../../lib/lifeCycle.js";
import { resolveAddrsAndPeerIds } from "../../lib/multiaddres.js";

export default class CCInfo extends BaseCommand<typeof CCInfo> {
  static override description = "Get info about capacity commitments";
  static override flags = {
    ...baseFlags,
    // ...NOX_NAMES_FLAG,
    // ids: Flags.string({
    //   description: "Comma-separated list of capacity commitment ids",
    //   exclusive: [OFFERS_FLAG_NAME],
    // }),
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    await initCli(this, await this.parse(CCInfo));
    const { dealClient } = await getDealClient();
    const market = await dealClient.getMarket();
    const capacity = await dealClient.getCapacity();

    const cc = await Promise.all(
      (await resolveAddrsAndPeerIds()).map(async ({ peerId }) => {
        const peer = await market.getComputePeer(peerId);
        return capacity.getCommitment(peer.commitmentId);
      }),
    );

    // TODO: complete this command implementation
    commandObj.logToStderr(jsonStringify(cc));
  }
}
