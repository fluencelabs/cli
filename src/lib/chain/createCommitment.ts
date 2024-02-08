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
import parse from "parse-duration";

import { commandObj } from "../commandObj.js";
import { resolveComputePeersByNames } from "../configs/project/provider.js";
import { getDealClient, getEventValues, signBatch } from "../dealClient.js";
import { splitErrorsAndResults, stringifyUnknown } from "../helpers/utils.js";

import { peerIdToUint8Array } from "./peerIdToUint8Array.js";

export async function createCommitments(flags: {
  noxes?: number | undefined;
  config?: string | undefined;
  env: string | undefined;
  "priv-key": string | undefined;
  "nox-names"?: string | undefined;
}) {
  const computePeers = await resolveComputePeersByNames(flags);
  const { dealClient, signerOrWallet } = await getDealClient();
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();
  const precision = await core.precision();
  const signerAddress = await signerOrWallet.getAddress();

  const createCommitmentsTxReceipt = await signBatch(
    computePeers.map(async ({ peerId, capacityCommitment }) => {
      const peerIdUint8Arr = await peerIdToUint8Array(peerId);
      const ccDuration = (parse(capacityCommitment.duration) ?? 0) / 1000;
      const ccDelegator = capacityCommitment.delegator;

      const ccRewardDelegationRate = Math.floor(
        (capacityCommitment.rewardDelegationRate / 100) * Number(precision),
      );

      return capacity.createCommitment.populateTransaction(
        peerIdUint8Arr,
        ccDuration,
        ccDelegator ?? signerAddress,
        ccRewardDelegationRate,
      );
    }),
  );

  if (createCommitmentsTxReceipt === undefined) {
    return commandObj.error(
      "The are no compute peers to create commitments for",
    );
  }

  const commitmentIds = getEventValues({
    txReceipt: createCommitmentsTxReceipt,
    contract: capacity,
    eventName: "CommitmentCreated",
    value: "commitmentId",
  });

  const [notStringCommitmentIds, stringCommitmentIds] = splitErrorsAndResults(
    commitmentIds,
    (id) => {
      if (typeof id !== "string") {
        return { error: stringifyUnknown(id) };
      }

      return { result: id };
    },
  );

  if (notStringCommitmentIds.length > 0) {
    return commandObj.error(
      `Wasn't able to get id for some of the commitments. Got: ${notStringCommitmentIds.join(
        ", ",
      )}`,
    );
  }

  commandObj.logToStderr(
    color.green(
      `Commitments ${stringCommitmentIds.join(", ")} were registered`,
    ),
  );

  return stringCommitmentIds;
}
