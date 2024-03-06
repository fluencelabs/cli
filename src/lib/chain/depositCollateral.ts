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

export async function getComputePeersWithCommitmentCreatedEvents(
  computePeers: ResolvedComputePeer[],
) {
  const { dealClient } = await getDealClient();

  // TODO: replace with this after Elshan's fix

  // const market = await dealClient.getMarket();

  // const [errors, computePeersWithChainInfo] = splitErrorsAndResults(
  //   await Promise.allSettled(
  //     computePeers.map(async (computePeer) => {
  //       const chainInfo = await market.getComputePeer(
  //         await peerIdToUint8Array(computePeer.peerId),
  //       );

  //       return {
  //         ...computePeer,
  //         commitmentId: chainInfo.commitmentId,
  //         offerId: chainInfo.offerId,
  //         owner: chainInfo.owner,
  //         unitCount: chainInfo.unitCount,
  //       };
  //     }),
  //   ),
  //   (res) => {
  //     if (res.status === "fulfilled") {
  //       return { result: res.value };
  //     }

  //     return { error: stringifyUnknown(res.reason) };
  //   },
  // );

  // if (errors.length > 0) {
  //   commandObj.error(
  //     `Failed to get commitment IDs for noxes: ${errors.join("\n")}`,
  //   );
  // }

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

  return computePeersWithCommitmentCreatedEvents;
}

export async function depositCollateralByNoxNames(flags: {
  [NOX_NAMES_FLAG_NAME]: string | undefined;
}) {
  const computePeers = await resolveComputePeersByNames(flags);

  const computePeersWithCommitmentCreatedEvents =
    await getComputePeersWithCommitmentCreatedEvents(computePeers);

  commandObj.log(
    `Found created commitments for the following peers: ${color.yellow(
      computePeersWithCommitmentCreatedEvents
        .map(({ name }) => {
          return name;
        })
        .join(", "),
    )}`,
  );

  const commitmentIds = computePeersWithCommitmentCreatedEvents.map(
    ({ event, ...rest }) => {
      return { commitmentId: event.args.commitmentId, event, ...rest };
    },
  );

  await depositCollateral(commitmentIds);
}

export async function depositCollateral(
  commitmentIds: (
    | { commitmentId: string }
    | ({ commitmentId: string } & ComputePeerWithCommitmentCreatedEvent)
  )[],
  // | (Awaited<
  //     ReturnType<
  //       Awaited<ReturnType<DealClient["getMarket"]>>["getComputePeer"]
  //     >
  //   > &
  //     ResolvedComputePeer)
) {
  const [firstCommitmentId] = commitmentIds;

  const isProvider =
    firstCommitmentId !== undefined && "peerId" in firstCommitmentId;

  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();

  const computePeersWithCollateral = await Promise.all(
    commitmentIds.map(async ({ commitmentId, ...rest }) => {
      return {
        ...rest,
        commitmentId,
        collateral: await getCollateral(commitmentId),
      };
    }),
  );

  const collateralToApproveCommitment = computePeersWithCollateral.reduce(
    (acc, c) => {
      return acc + c.collateral;
    },
    0n,
  );

  await sign(
    capacity.depositCollateral,
    commitmentIds.map(({ commitmentId }) => {
      return commitmentId;
    }),
    {
      value: collateralToApproveCommitment,
    },
  );

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
Commitment ID: ${color.yellow(c.commitmentId)}
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
