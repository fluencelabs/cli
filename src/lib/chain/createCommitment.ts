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

import type { DealClient } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import parse from "parse-duration";

import { commandObj } from "../commandObj.js";
import {
  resolveComputePeersByNames,
  type EnsureComputerPeerConfigs,
} from "../configs/project/provider.js";
import { getDealClient, sign } from "../dealClient.js";

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
  const commitmentIds: string[] = [];
  const { dealClient, signerOrWallet } = await getDealClient();
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();
  const precision = await core.precision();
  const signerAddress = await signerOrWallet.getAddress();

  for (const computePeer of computePeers) {
    commitmentIds.push(
      await createCommitment({
        ...computePeer,
        capacity,
        precision,
        signerAddress,
      }),
    );
  }

  commandObj.logToStderr(
    color.green(`Commitments ${commitmentIds.join(", ")} were registered`),
  );

  return commitmentIds;
}

async function createCommitment({
  name,
  peerId,
  capacityCommitment,
  capacity,
  precision,
  signerAddress,
}: EnsureComputerPeerConfigs & {
  capacity: Awaited<ReturnType<DealClient["getCapacity"]>>;
  precision: bigint;
  signerAddress: string;
}) {
  commandObj.logToStderr(color.gray(`Create capacity commitment for ${name}`));

  const peerIdUint8Arr = await peerIdToUint8Array(peerId);
  const ccDuration = (parse(capacityCommitment.duration) ?? 0) / 1000;
  const ccDelegator = capacityCommitment.delegator;

  const ccRewardDelegationRate = Math.floor(
    (capacityCommitment.rewardDelegationRate / 100) * Number(precision),
  );

  const res = await sign(
    capacity.createCommitment,
    peerIdUint8Arr,
    ccDuration,
    ccDelegator ?? signerAddress,
    ccRewardDelegationRate,
  );

  const event = capacity.getEvent(CAPACITY_COMMITMENT_CREATED_EVENT);

  const log = res.logs.find((log) => {
    return log.topics[0] === event.fragment.topicHash;
  });

  assert(log !== undefined, "Capacity commitment created event not found");

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

  commandObj.logToStderr(
    color.green(`Capacity commitment was created with id ${color.yellow(id)}`),
  );

  return id;
}
