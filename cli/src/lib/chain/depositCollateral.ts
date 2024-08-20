/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { color } from "@oclif/color";

import { commandObj } from "../commandObj.js";
import { getDealClient, getReadonlyDealClient, sign } from "../dealClient.js";
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

  await sign({
    title: `Deposit ${await fltFormatWithSymbol(collateralToApproveCommitment)} collateral to the following capacity commitments:\n\n${commitments
      .map(({ commitmentId, noxName, peerId }) => {
        return [noxName, peerId, commitmentId].filter(Boolean).join("\n");
      })
      .join("\n\n")}`,
    method: capacity.depositCollateral,
    args: [
      commitments.map(({ commitmentId }) => {
        return commitmentId;
      }),
      { value: collateralToApproveCommitment },
    ],
  });

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

${(
  await Promise.all(
    commitmentsWithCollateral.map(async (c) => {
      return `Capacity commitment successfully activated!\n${stringifyBasicCommitmentInfo(
        c,
      )}\nCollateral: ${color.yellow(await fltFormatWithSymbol(c.collateral))}`;
    }),
  )
).join("\n\n")}`,
  );
}

async function getCollateral(commitmentId: string) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const capacity = readonlyDealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
