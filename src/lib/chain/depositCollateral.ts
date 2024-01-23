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

import { commandObj } from "../commandObj.js";
import { getDealClient } from "../dealClient.js";
import { getSecretKeyOrReturnExisting } from "../keyPairs.js";
import { getPeerIdFromSecretKey } from "../multiaddres.js";

import { peerIdToUint8Array } from "./peerIdToUint8Array.js";

export async function depositCollateralByNoxName(noxNames: string[]) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();
  const { ethers } = await import("ethers");

  const PeerIdHexes = await Promise.all(
    noxNames.map(async (noxName) => {
      const { secretKey } = await getSecretKeyOrReturnExisting(noxName);
      const peerId = await getPeerIdFromSecretKey(secretKey);
      const peerIdUint8Arr = await peerIdToUint8Array(peerId);
      return ethers.hexlify(peerIdUint8Arr);
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
  let collateralToApproveCommitments = 0n;

  for (const commitmentId of commitmentIds) {
    const collateralToApproveCommitment = await getCollateral(commitmentId);

    collateralToApproveCommitments =
      collateralToApproveCommitments + collateralToApproveCommitment;
  }

  commandObj.logToStderr(
    `Send approve of FLT for all commitments for value: ${collateralToApproveCommitments}...`,
  );

  const flt = await dealClient.getFLT();

  const collateralToApproveCommitmentsTx = await flt.approve(
    await capacity.getAddress(),
    collateralToApproveCommitments,
  );

  await collateralToApproveCommitmentsTx.wait();

  for (const commitmentId of commitmentIds) {
    const collateralToApproveCommitment = await getCollateral(commitmentId);

    const collateralToApproveCommitmentsTx = await flt.approve(
      await capacity.getAddress(),
      collateralToApproveCommitment,
    );

    await collateralToApproveCommitmentsTx.wait();

    commandObj.logToStderr(
      `Depositing collateral: ${collateralToApproveCommitment} for commitmentId: ${commitmentId}...`,
    );

    const depositCollateralTx = await capacity.depositCollateral(commitmentId);
    await depositCollateralTx.wait();
  }
}

async function getCollateral(commitmentId: string) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
