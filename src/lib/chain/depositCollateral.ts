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

import type { CommitmentCreatedEvent } from "@fluencelabs/deal-ts-clients/dist/typechain-types/Capacity.js";
import type {
  TypedContractEvent,
  TypedEventLog,
} from "@fluencelabs/deal-ts-clients/dist/typechain-types/common.js";
import { color } from "@oclif/color";

import { commandObj } from "../commandObj.js";
import {
  type ResolvedComputePeer,
  resolveComputePeersByNames,
} from "../configs/project/provider.js";
import { NOX_NAMES_FLAG_NAME } from "../const.js";
import { getDealClient, sign } from "../dealClient.js";

import { peerIdToUint8Array } from "./conversions.js";

type ComputePeerWithCommitmentCreatedEvent = ResolvedComputePeer & {
  event: TypedEventLog<
    TypedContractEvent<
      CommitmentCreatedEvent.InputTuple,
      CommitmentCreatedEvent.OutputTuple,
      CommitmentCreatedEvent.OutputObject
    >
  >;
  peerIdHex: string;
};

export async function depositCollateralByNoxNames(flags: {
  [NOX_NAMES_FLAG_NAME]: string | undefined;
}) {
  const { dealClient } = await getDealClient();
  const computePeers = await resolveComputePeersByNames(flags);
  const capacity = await dealClient.getCapacity();
  const { ethers } = await import("ethers");

  const computePeersWithPeerIdHexes = await Promise.all(
    computePeers.map(async (computePeer) => {
      return {
        ...computePeer,
        peerIdHex: ethers.hexlify(await peerIdToUint8Array(computePeer.peerId)),
      };
    }),
  );

  const commitmentCreatedEvents = await capacity.queryFilter(
    capacity.filters.CommitmentCreated,
  );

  const computePeersWithCommitmentCreatedEvents = computePeersWithPeerIdHexes
    .map((computePeerWithPeerIdHexes) => {
      const event = commitmentCreatedEvents.find((e) => {
        return e.args.peerId === computePeerWithPeerIdHexes.peerIdHex;
      });

      return {
        ...computePeerWithPeerIdHexes,
        event,
      };
    })
    .filter((c): c is ComputePeerWithCommitmentCreatedEvent => {
      return c.event !== undefined;
    });

  const commitmentIds = computePeersWithCommitmentCreatedEvents.map((c) => {
    return c.event.args.commitmentId;
  });

  if (commitmentIds.length === 0) {
    return commandObj.error(
      `Wasn't able to find any commitments for the given peers. Was searching for: ${computePeersWithPeerIdHexes
        .map((c) => {
          return c.name;
        })
        .join(", ")}`,
    );
  }

  commandObj.log(
    `Found created commitments for the following peers: ${computePeersWithCommitmentCreatedEvents
      .map((c) => {
        return c.name;
      })
      .join(", ")}`,
  );

  await depositCollateral(
    commitmentIds,
    computePeersWithCommitmentCreatedEvents,
  );
}

export async function depositCollateral(
  commitmentIds: string[],
  computePeersWithCommitmentCreatedEvents?: ComputePeerWithCommitmentCreatedEvent[],
) {
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

  const computePeersWithCollateral: (
    | (ComputePeerWithCommitmentCreatedEvent & { collateral: bigint })
    | {
        collateral: bigint;
        event: {
          args: {
            commitmentId: string;
          };
        };
      }
  )[] = await Promise.all(
    computePeersWithCommitmentCreatedEvents === undefined
      ? commitmentIds.map(async (commitmentId) => {
          return {
            collateral: await getCollateral(commitmentId),
            event: {
              args: {
                commitmentId,
              },
            },
          };
        })
      : computePeersWithCommitmentCreatedEvents.map(async (c) => {
          return {
            ...c,
            collateral: await getCollateral(c.event.args.commitmentId),
          };
        }),
  );

  const collateralToApproveCommitment = computePeersWithCollateral.reduce(
    (acc, c) => {
      return acc + c.collateral;
    },
    0n,
  );

  await sign(capacity.depositCollateral, commitmentIds, {
    value: collateralToApproveCommitment,
  });

  const { ethers } = await import("ethers");

  commandObj.logToStderr(
    `${color.yellow(
      commitmentIds.length,
    )} capacity commitments have been successfully activated by adding collateral!
ATTENTION: Capacity proofs are expected to be sent in next epochs!
Deposited ${color.yellow(
      ethers.formatEther(collateralToApproveCommitment),
    )} collateral in total

${computePeersWithCollateral
  .map((c) => {
    return `Capacity commitment${
      "name" in c ? ` for ${color.yellow(c.name)}` : ""
    } successfully activated!
Commitment ID: ${color.yellow(c.event.args.commitmentId)}
Collateral: ${color.yellow(ethers.formatEther(c.collateral))}
${
  "computeUnits" in c
    ? `Peer ID: ${color.yellow(c.peerId)}
Number of compute units: ${color.yellow(c.computeUnits)}
`
    : ""
}`;
  })
  .join("\n\n")}`,
  );
}

async function getCollateral(commitmentId: string) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
