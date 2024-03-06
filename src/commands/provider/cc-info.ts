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
import isUndefined from "lodash-es/isUndefined.js";
import omitBy from "lodash-es/omitBy.js";
import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { peerIdToUint8Array } from "../../lib/chain/conversions.js";
import { getComputePeersWithCommitmentCreatedEvents } from "../../lib/chain/depositCollateral.js";
import { commandObj } from "../../lib/commandObj.js";
import { resolveComputePeersByNames } from "../../lib/configs/project/provider.js";
import { CHAIN_FLAGS, CLI_NAME, NOX_NAMES_FLAG } from "../../lib/const.js";
import { getReadonlyDealClient } from "../../lib/dealClient.js";
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
    const { readonlyDealClient } = await getReadonlyDealClient();
    const market = await readonlyDealClient.getMarket();
    const capacity = await readonlyDealClient.getCapacity();

    const computePeers = await resolveComputePeersByNames(flags);

    const computePeersWithCommitmentCreatedEvents =
      await getComputePeersWithCommitmentCreatedEvents(computePeers);

    const { ethers } = await import("ethers");

    const infos = await Promise.all(
      computePeers.map(async ({ peerId, name }) => {
        const { event } =
          computePeersWithCommitmentCreatedEvents.find((c) => {
            return c.name === name;
          }) ?? {};

        let commitmentId = event?.args.commitmentId;

        let commitment: Partial<
          Awaited<ReturnType<(typeof capacity)["getCommitment"]>>
        > =
          event === undefined
            ? {}
            : {
                peerId: event.args.peerId,
                rewardDelegatorRate: event.args.rewardDelegationRate,
                collateralPerUnit: event.args.fltCollateralPerUnit,
                delegator: event.args.delegator,
              };

        try {
          const peer = await market.getComputePeer(
            await peerIdToUint8Array(peerId),
          );

          commitment = await capacity.getCommitment(
            peer.commitmentId === ethers.ZeroAddress.toString() &&
              commitmentId !== undefined
              ? commitmentId
              : peer.commitmentId,
          );

          commitmentId = peer.commitmentId;
        } catch {}

        return omitBy(
          {
            Nox: name,
            PeerId: peerId,
            "PeerId Hex": commitment.peerId,
            "Capacity commitment ID": commitmentId,
            Status:
              commitmentId === undefined
                ? `NotCreated (you can create it using '${CLI_NAME} provider cc-create' command)`
                : ccStatusToString(commitment.status) ??
                  `WaitDelegation (you can activate it using '${CLI_NAME} provider cc-activate' command)`,
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

function ccStatusToString(status: bigint | undefined) {
  return [
    "Active",
    "WaitDelegation",
    "WaitStart",
    "Inactive",
    "Failed",
    "Removed",
  ][Number(status)];
}

function rewardDelegationRateToString(rewardDelegatorRate: bigint | undefined) {
  if (rewardDelegatorRate === undefined) {
    return undefined;
  }

  return `${Number(rewardDelegatorRate) / 10 ** 5}%`;
}
