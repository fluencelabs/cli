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

import { commandObj } from "../commandObj.js";
import { getDealClient, sign } from "../dealClient.js";
import { splitErrorsAndResults } from "../helpers/utils.js";

import {
  stringifyBasicCommitmentInfo,
  getCommitmentsInfo,
  basicCCInfoAndStatusToString,
} from "./commitment.js";
import { type CCFlags } from "./commitment.js";
import { fltFormatWithSymbol } from "./currencies.js";

export async function depositCollateral(flags: CCFlags) {
  const { CommitmentStatus } = await import("@fluencelabs/deal-ts-clients");

  const [commitmentsWithInvalidStatus, commitments] = splitErrorsAndResults(
    await getCommitmentsInfo(flags),
    (c) => {
      if (c.status === CommitmentStatus.WaitDelegation) {
        return { result: c };
      }

      return { error: c };
    },
  );

  if (commitmentsWithInvalidStatus.length > 0) {
    commandObj.warn(
      `It's only possible to deposit collateral to the capacity commitments in the "WaitDelegation" status. The following commitments have invalid status:\n\n${await basicCCInfoAndStatusToString(
        commitmentsWithInvalidStatus,
      )}`,
    );
  }

  if (commitments.length === 0) {
    return commandObj.error(
      "No capacity commitments in the 'WaitDelegation' status found",
    );
  }

  const [firstCommitment] = commitments;

  const isProvider =
    firstCommitment !== undefined &&
    "providerConfigComputePeer" in firstCommitment;

  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();

  const commitmentsWithCollateral = await Promise.all(
    commitments.map(async (commitment) => {
      return {
        ...commitment,
        collateral: await getCollateral(commitment.commitmentId),
      };
    }),
  );

  const collateralToApproveCommitment = commitmentsWithCollateral.reduce(
    (acc, c) => {
      return acc + c.collateral;
    },
    0n,
  );

  await sign(
    capacity.depositCollateral,
    commitments.map(({ commitmentId }) => {
      return commitmentId;
    }),
    {
      value: collateralToApproveCommitment,
    },
  );

  commandObj.logToStderr(
    `${color.yellow(
      commitments.length,
    )} capacity commitments have been successfully activated by adding collateral!
${
  isProvider
    ? "ATTENTION: Capacity proofs are expected to be sent in next epochs!"
    : ""
}
Deposited ${color.yellow(
      await fltFormatWithSymbol(collateralToApproveCommitment),
    )} collateral in total

${commitmentsWithCollateral
  .map((c) => {
    return `Capacity commitment successfully activated!\n${stringifyBasicCommitmentInfo(
      c,
    )}`;
  })
  .join("\n\n")}`,
  );
}

async function getCollateral(commitmentId: string) {
  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
