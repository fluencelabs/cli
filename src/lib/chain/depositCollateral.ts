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
import { yamlDiffPatch } from "yaml-diff-patch";

import { commandObj } from "../commandObj.js";
import {
  type ResolvedComputePeer,
  resolveComputePeersByNames,
} from "../configs/project/provider.js";
import { NOX_NAMES_FLAG_NAME } from "../const.js";
import { getDealClient, sign } from "../dealClient.js";

import { peerIdHexStringToBase58String } from "./conversions.js";
import { fltFormatWithSymbol } from "./currencies.js";

type ComputePeerWithCommitmentCreatedEvent = ResolvedComputePeer & {
  event: TypedEventLog<
    TypedContractEvent<
      CommitmentCreatedEvent.InputTuple,
      CommitmentCreatedEvent.OutputTuple,
      CommitmentCreatedEvent.OutputObject
    >
  >;
};

export async function depositCollateralByNoxNames(flags: {
  [NOX_NAMES_FLAG_NAME]: string | undefined;
}) {
  const { dealClient } = await getDealClient();
  const computePeers = await resolveComputePeersByNames(flags);
  const capacity = await dealClient.getCapacity();

  const commitmentCreatedEvents = await Promise.all(
    (await capacity.queryFilter(capacity.filters.CommitmentCreated)).map(
      async (event) => {
        return {
          event,
          peerId: await peerIdHexStringToBase58String(event.args.peerId),
        };
      },
    ),
  );

  if (commitmentCreatedEvents.length === 0) {
    return commandObj.error(
      `capacity.queryFilter(capacity.filters.CommitmentCreated) didn't return any CommitmentCreated events`,
    );
  }

  const computePeersWithCommitmentCreatedEvents = computePeers
    .map((computePeer) => {
      const { event } =
        commitmentCreatedEvents.find(({ peerId }) => {
          return peerId === computePeer.peerId;
        }) ?? {};

      return {
        ...computePeer,
        event,
      };
    })
    .filter((c): c is ComputePeerWithCommitmentCreatedEvent => {
      return c.event !== undefined;
    });

  if (computePeersWithCommitmentCreatedEvents.length === 0) {
    return commandObj.error(
      `Wasn't able to find any commitments for the given peers. Was searching for peers: ${computePeersWithCommitmentCreatedEvents
        .map(({ name, peerId }) => {
          return `${color.yellow(name)}: ${peerId}`;
        })
        .join(
          "\n",
        )}\n\nGot events with the following peerIds: ${commitmentCreatedEvents
        .map(({ peerId, event }) => {
          return yamlDiffPatch(
            "",
            {},
            {
              "Peer ID": peerId,
              "Peer ID hex": event.args.peerId,
            },
          );
        })
        .join("\n")}`,
    );
  }

  commandObj.log(
    `Found created commitments for the following peers: ${color.yellow(
      computePeersWithCommitmentCreatedEvents
        .map(({ name }) => {
          return name;
        })
        .join(", "),
    )}`,
  );

  const commitmentIds = computePeersWithCommitmentCreatedEvents.map((c) => {
    return c.event.args.commitmentId;
  });

  await depositCollateral(
    commitmentIds,
    computePeersWithCommitmentCreatedEvents,
  );
}

export async function depositCollateral(
  commitmentIds: string[],
  computePeersWithCommitmentCreatedEvents?: ComputePeerWithCommitmentCreatedEvent[],
) {
  const isProvider = computePeersWithCommitmentCreatedEvents !== undefined;
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

  commandObj.logToStderr(
    `${color.yellow(
      commitmentIds.length,
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
    computePeersWithCollateral.map(async (c) => {
      return `Capacity commitment${
        "name" in c ? ` for ${color.yellow(c.name)}` : ""
      } successfully activated!
Commitment ID: ${color.yellow(c.event.args.commitmentId)}
Collateral: ${color.yellow(await fltFormatWithSymbol(c.collateral))}
${
  "computeUnits" in c
    ? `Peer ID: ${color.yellow(c.peerId)}
Number of compute units: ${color.yellow(c.computeUnits)}
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
  const capacity = await dealClient.getCapacity();
  const commitment = await capacity.getCommitment(commitmentId);
  return commitment.collateralPerUnit * commitment.unitCount;
}
