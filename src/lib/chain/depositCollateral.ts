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

import { resolveComputePeersByNames } from "../configs/project/provider.js";
import { NOX_NAMES_FLAG_NAME } from "../const.js";
import { getDealClient, sign } from "../dealClient.js";

import { peerIdToUint8Array } from "./peerIdToUint8Array.js";

export async function depositCollateralByNoxNames(flags: {
  [NOX_NAMES_FLAG_NAME]: string | undefined;
}) {
  const { dealClient } = await getDealClient();
  const computePeers = await resolveComputePeersByNames(flags);
  const capacity = await dealClient.getCapacity();
  const { ethers } = await import("ethers");

  const PeerIdHexes = await Promise.all(
    computePeers.map(async ({ peerId }) => {
      return ethers.hexlify(await peerIdToUint8Array(peerId));
    }),
  );

  const commitmentIds = (
    await capacity.queryFilter(capacity.filters.CommitmentCreated)
  )
    .filter((e) => {
      return PeerIdHexes.find((peerIdHex) => {
        return e.args.peerId === peerIdHex;
      });
    })
    .map((e) => {
      return e.args.commitmentId;
    });

  await depositCollateral(commitmentIds);
}

export async function depositCollateral(commitmentIds: string[]) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();

  // let collateralToApproveCommitments = 0n;

  // for (const commitmentId of commitmentIds) {
  //   const collateralToApproveCommitment = await getCollateral(commitmentId);

  //   collateralToApproveCommitments =
  //     collateralToApproveCommitments + collateralToApproveCommitment;
  // }

  // await sign(
  //   flt.approve,
  //   await capacity.getAddress(),
  //   collateralToApproveCommitments,
  // )

  const collateralToApproveCommitment = (
    await Promise.all(
      commitmentIds.map((commitmentId) => {
        return getCollateral(commitmentId);
      }),
    )
  ).reduce((acc, v) => {
    return acc + v;
  }, 0n);

  await sign(capacity.depositCollateral, commitmentIds, {
    value: collateralToApproveCommitment,
  });
}

async function getCollateral(commitmentId: string) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
