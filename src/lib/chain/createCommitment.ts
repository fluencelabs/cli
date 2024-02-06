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

import assert from "assert";

import { color } from "@oclif/color";
import parse from "parse-duration";

import { commandObj } from "../commandObj.js";
import { resolveComputePeersByNames } from "../configs/project/provider.js";
import { getDealClient, signBatch } from "../dealClient.js";

import { peerIdToUint8Array } from "./peerIdToUint8Array.js";

const CAPACITY_COMMITMENT_CREATED_EVENT = "CommitmentCreated";

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

  const res = await signBatch(
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

  if (res === undefined) {
    return commandObj.error(
      "The are no compute peers to create commitments for",
    );
  }

  const event = capacity.getEvent(CAPACITY_COMMITMENT_CREATED_EVENT);

  const logs = res.logs.filter((log) => {
    return log.topics[0] === event.fragment.topicHash;
  });

  const commitmentIds = logs.map((log) => {
    const id: unknown = capacity.interface
      .parseLog({
        topics: [...log.topics],
        data: log.data,
      })
      ?.args.getValue("commitmentId");

    assert(
      typeof id === "string",
      "Capacity commitment created but id not found in the event log",
    );

    return id;
  });

  commandObj.logToStderr(
    color.green(`Commitments ${commitmentIds.join(", ")} were registered`),
  );

  return commitmentIds;
}
