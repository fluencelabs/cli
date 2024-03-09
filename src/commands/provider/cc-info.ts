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

import type { ICapacity } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import isUndefined from "lodash-es/isUndefined.js";
import omitBy from "lodash-es/omitBy.js";
import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import {
  ccStatusToString,
  getCommitments,
} from "../../lib/chain/commitment.js";
import { commandObj } from "../../lib/commandObj.js";
import { CHAIN_FLAGS, CC_FLAGS } from "../../lib/const.js";
import { getReadonlyDealClient } from "../../lib/dealClient.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class CCInfo extends BaseCommand<typeof CCInfo> {
  static override aliases = ["provider:ci"];
  static override description = "Get info about capacity commitments";
  static override flags = {
    ...baseFlags,
    ...CHAIN_FLAGS,
    ...CC_FLAGS,
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(CCInfo));
    const { readonlyDealClient } = await getReadonlyDealClient();
    const capacity = await readonlyDealClient.getCapacity();
    const commitments = await getCommitments(flags);
    const { ethers } = await import("ethers");

    const infos = await Promise.all(
      commitments.map(async (c) => {
        let commitment: Partial<ICapacity.CommitmentViewStructOutput> =
          "commitmentCreatedEvent" in c
            ? {
                peerId: c.commitmentCreatedEvent.args.peerId,
                rewardDelegatorRate:
                  c.commitmentCreatedEvent.args.rewardDelegationRate,
                collateralPerUnit:
                  c.commitmentCreatedEvent.args.fltCollateralPerUnit,
                delegator: c.commitmentCreatedEvent.args.delegator,
              }
            : {};

        try {
          commitment = await capacity.getCommitment(c.commitmentId);
        } catch {}

        return omitBy(
          {
            ...("providerConfigComputePeer" in c
              ? {
                  Nox: c.providerConfigComputePeer.name,
                  PeerId: c.providerConfigComputePeer.peerId,
                }
              : {}),
            "PeerId Hex": commitment.peerId,
            "Capacity commitment ID": c.commitmentId,
            Status: ccStatusToString(commitment.status),
            "Start epoch": commitment.startEpoch?.toString(),
            "End epoch": commitment.endEpoch?.toString(),
            "Reward delegator rate": rewardDelegationRateToString(
              commitment.rewardDelegatorRate,
            ),
            Delegator:
              commitment.delegator === ethers.ZeroAddress.toString()
                ? "Anyone can activate capacity commitment"
                : commitment.delegator,
            "Total CU": commitment.unitCount?.toString(),
            "Failed epoch": commitment.failedEpoch?.toString(),
            "Total CU Fail Count": commitment.totalCUFailCount?.toString(),
            "Collateral per unit": commitment.collateralPerUnit?.toString(),
            "Exited unit count": commitment.exitedUnitCount?.toString(),
          },
          isUndefined,
        );
      }),
    );

    for (const { Nox, ...restInfo } of infos) {
      commandObj.logToStderr(color.yellow(`Nox: ${Nox}`));
      commandObj.logToStderr(yamlDiffPatch("", {}, restInfo));
    }
  }
}

function rewardDelegationRateToString(rewardDelegatorRate: bigint | undefined) {
  if (rewardDelegatorRate === undefined) {
    return undefined;
  }

  return `${Number(rewardDelegatorRate) / 10 ** 5}%`;
}
