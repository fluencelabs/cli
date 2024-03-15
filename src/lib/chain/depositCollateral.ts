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

import { getCommitments, type CCFlags } from "./commitment.js";
import { fltFormatWithSymbol } from "./currencies.js";

export async function depositCollateral(flags: CCFlags) {
  const commitments = await getCommitments(flags);
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

${(
  await Promise.all(
    commitmentsWithCollateral.map(async (c) => {
      return `Capacity commitment${
        "providerConfigComputePeer" in c
          ? ` for ${color.yellow(c.providerConfigComputePeer.name)}`
          : ""
      } successfully activated!
Commitment ID: ${color.yellow(c.commitmentId)}
Collateral: ${color.yellow(await fltFormatWithSymbol(c.collateral))}
${
  "providerConfigComputePeer" in c
    ? `Peer ID: ${color.yellow(c.providerConfigComputePeer.peerId)}
Number of compute units: ${color.yellow(
        c.providerConfigComputePeer.computeUnits,
      )}
`
    : ""
}`;
    }),
  )
).join("\n\n")}`,
  );
}

async function getCollateral(commitmentId: string) {
  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
