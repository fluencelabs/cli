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
import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { peerIdToUint8Array } from "../../lib/chain/peerIdToUint8Array.js";
import { commandObj } from "../../lib/commandObj.js";
import { resolveComputePeersByNames } from "../../lib/configs/project/provider.js";
import { CHAIN_FLAGS, NOX_NAMES_FLAG } from "../../lib/const.js";
import { getDealClient } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CCInfo extends BaseCommand<typeof CCInfo> {
  static override aliases = ["provider:ci"];
  static override description = "Get info about capacity commitments";
  static override flags = {
    ...baseFlags,
    ...NOX_NAMES_FLAG,
    ...CHAIN_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CCInfo));
    const { dealClient } = await getDealClient();
    const market = await dealClient.getMarket();
    const capacity = await dealClient.getCapacity();

    const computePeers = await resolveComputePeersByNames(flags);

    const infos = await Promise.all(
      computePeers.map(async ({ peerId, name }) => {
        const peer = await market.getComputePeer(
          await peerIdToUint8Array(peerId),
        );

        const commitment = await capacity.getCommitment(peer.commitmentId);

        return {
          name,
          info: {
            "Peer id": peerId,
            "Peer id Hex": commitment.peerId,
            Status: ccStatusToString(commitment.status),
            "Start epoch": commitment.startEpoch.toString(),
            "End epoch": commitment.endEpoch.toString(),
            "Reward delegator rate": commitment.rewardDelegatorRate.toString(),
            "Collateral per unit": commitment.collateralPerUnit.toString(),
            Delegator: commitment.delegator.toString(),
            "Existed unit count": commitment.exitedUnitCount.toString(),
            "Failed epoch": commitment.failedEpoch.toString(),
            "Unit count": commitment.unitCount.toString(),
            "Total compute unit fail count":
              commitment.totalCUFailCount.toString(),
          },
        };
      }),
    );

    for (const { name, info } of infos) {
      // TODO: complete this command implementation
      commandObj.logToStderr(color.yellow(name));
      commandObj.logToStderr(yamlDiffPatch("", {}, info));
    }
  }
}

function ccStatusToString(status: bigint) {
  switch (status) {
    case 0n:
      return "Active";
    case 1n:
      return "WaitDelegation";
    case 2n:
      return "WaitStart";
    case 3n:
      return "Inactive";
    case 4n:
      return "Failed";
    case 5n:
      return "Removed";
    default:
      return "Unknown";
  }
}
