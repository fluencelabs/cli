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
import { getContracts, getReadonlyContracts, sign } from "../dealClient.js";
import { ccIds } from "../gql/gql.js";
import { splitErrorsAndResults } from "../helpers/utils.js";

import {
  stringifyBasicCommitmentInfo,
  getCommitmentsGroupedByStatus,
  basicCCInfoAndStatusToString,
} from "./commitment.js";
import { type CCFlags } from "./commitment.js";
import { peerIdHexStringToBase58String } from "./conversions.js";
import { fltFormatWithSymbol } from "./currencies.js";

export async function depositCollateral(flags: CCFlags) {
  const [commitmentsWithInvalidStatus, commitmentsWithWaitDelegation] =
    splitErrorsAndResults(
      await getCommitmentsGroupedByStatus(flags, ccIds),
      (c) => {
        return c.status === "WaitDelegation" ? { result: c } : { error: c };
      },
    );

  if (commitmentsWithInvalidStatus.length > 0) {
    commandObj.warn(
      `It's only possible to deposit collateral to the capacity commitments in the "WaitDelegation" status. The following commitments have invalid status:\n\n${await basicCCInfoAndStatusToString(
        commitmentsWithInvalidStatus,
      )}`,
    );
  }

  const commitments = commitmentsWithWaitDelegation.flatMap(({ ccInfos }) => {
    return ccInfos;
  });

  if (commitments.length === 0) {
    return commandObj.error(
      "No capacity commitments in the 'WaitDelegation' status found",
    );
  }

  const [firstCommitment] = commitments;

  const isProvider =
    firstCommitment !== undefined &&
    "providerConfigComputePeer" in firstCommitment;

  const { contracts } = await getContracts();

  const commitmentsWithCollateral = await Promise.all(
    commitments.map(async (commitment) => {
      return {
        ...commitment,
        collateral: await getCollateral(commitment.infoFromSubgraph.id),
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
    title: `Deposit ${await fltFormatWithSymbol(collateralToApproveCommitment)} collateral to the following capacity commitments:\n\n${(
      await Promise.all(
        commitments.map(async ({ infoFromSubgraph, name }) => {
          return [
            name,
            await peerIdHexStringToBase58String(infoFromSubgraph.peer.id),
            infoFromSubgraph.id,
          ]
            .filter(Boolean)
            .join("\n");
        }),
      )
    ).join("\n\n")}`,
    method: contracts.diamond.depositCollateral,
    args: [
      commitments.map(({ infoFromSubgraph }) => {
        return infoFromSubgraph.id;
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
      return `Capacity commitment successfully activated!\n${await stringifyBasicCommitmentInfo(
        c,
      )}\nCollateral: ${color.yellow(await fltFormatWithSymbol(c.collateral))}`;
    }),
  )
).join("\n\n")}`,
  );
}

async function getCollateral(commitmentId: string) {
  const { readonlyContracts } = await getReadonlyContracts();

  const commitment =
    await readonlyContracts.diamond.getCommitment(commitmentId);

  return commitment.collateralPerUnit * commitment.unitCount;
}
