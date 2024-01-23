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

const DEFAULT_CONFIRMATIONS = 1;

export async function depositCollateral(commitmentIds: string[]) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();
  commandObj.logToStderr("Approve collateral for all sent CC...");
  let collateralToApproveCommitments = 0n;

  for (const commitmentId of commitmentIds) {
    const commitment = await capacity.getCommitment(commitmentId);

    const collateralToApproveCommitment =
      commitment.collateralPerUnit * commitment.unitCount;

    commandObj.logToStderr(
      `Collateral for commitmentId: ${commitmentId} = ${collateralToApproveCommitment}...`,
    );

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

  await collateralToApproveCommitmentsTx.wait(DEFAULT_CONFIRMATIONS);

  commandObj.logToStderr("Deposit collateral for all sent CC...");

  for (const commitmentId of commitmentIds) {
    commandObj.logToStderr(
      `Deposit collateral for commitmentId: ${commitmentId}...`,
    );

    const depositCollateralTx = await capacity.depositCollateral(commitmentId);
    await depositCollateralTx.wait(DEFAULT_CONFIRMATIONS);
  }
}
