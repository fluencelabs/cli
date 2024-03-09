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
import parse from "parse-duration";
import { yamlDiffPatch } from "yaml-diff-patch";

import { commandObj } from "../commandObj.js";
import {
  resolveComputePeersByNames,
  type ResolvedComputePeer,
} from "../configs/project/provider.js";
import { CLI_NAME, NOX_NAMES_FLAG_NAME } from "../const.js";
import { dbg } from "../dbg.js";
import { getDealClient, getEventValues, signBatch } from "../dealClient.js";
import {
  splitErrorsAndResults,
  stringifyUnknown,
  commaSepStrToArr,
} from "../helpers/utils.js";

import {
  peerIdHexStringToBase58String,
  peerIdToUint8Array,
} from "./conversions.js";

export type ComputePeersWithCC = Awaited<
  ReturnType<typeof getComputePeersWithCC>
>;

export async function getComputePeersWithCC(
  computePeers: ResolvedComputePeer[],
) {
  const { dealClient } = await getDealClient();
  const market = await dealClient.getMarket();
  const capacity = await dealClient.getCapacity();

  const commitmentCreatedEvents = Object.fromEntries(
    await Promise.all(
      (await capacity.queryFilter(capacity.filters.CommitmentCreated)).map(
        async (event) => {
          return [
            await peerIdHexStringToBase58String(event.args.peerId),
            event,
          ] as const;
        },
      ),
    ),
  );

  const computePeersWithChainInfo = (
    await Promise.all(
      computePeers.map(async (computePeer) => {
        const peerIdUint8Array = await peerIdToUint8Array(computePeer.peerId);

        return {
          providerConfigComputePeer: computePeer,
          commitmentCreatedEvent: commitmentCreatedEvents[computePeer.peerId],
          marketGetComputePeerRes: await (async () => {
            try {
              return await market.getComputePeer(peerIdUint8Array);
            } catch {
              return undefined;
            }
          })(),
        };
      }),
    )
  ).map((c) => {
    const commitmentId =
      c.commitmentCreatedEvent?.args.commitmentId ??
      c.marketGetComputePeerRes?.commitmentId;

    if (commitmentId === undefined) {
      return c;
    }

    return { ...c, commitmentId };
  });

  const [computePeersWithoutCCId, computePeersWithCCId] = splitErrorsAndResults(
    computePeersWithChainInfo,
    (computePeerWithChainInfo) => {
      if ("commitmentId" in computePeerWithChainInfo) {
        return {
          result: computePeerWithChainInfo,
        };
      }

      return {
        error: computePeerWithChainInfo,
      };
    },
  );

  if (computePeersWithoutCCId.length > 0) {
    commandObj.warn(
      `Some of the commitments are not found on chain for:\n${computePeersWithoutCCId
        .map(({ providerConfigComputePeer: { name, peerId } }) => {
          return `Nox: ${name}, PeerId: ${peerId}`;
        })
        .join(
          "\n",
        )}\n\nYou can create commitments using '${CLI_NAME} provider cc-create' command.`,
    );
  }

  return computePeersWithCCId;
}

export type CCFlags = {
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
  ids?: string | undefined;
};

export async function getCommitments(
  flags: CCFlags,
): Promise<{ commitmentId: string }[] | ComputePeersWithCC> {
  if (flags.ids !== undefined) {
    return commaSepStrToArr(flags.ids).map((commitmentId) => {
      return { commitmentId };
    });
  }

  return getComputePeersWithCC(await resolveComputePeersByNames(flags));
}

export async function createCommitments(flags: {
  env: string | undefined;
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
}) {
  const computePeers = await resolveComputePeersByNames(flags);
  const { dealClient } = await getDealClient();
  const core = await dealClient.getCore();
  const capacity = await dealClient.getCapacity();
  const precision = await core.precision();
  const { ethers } = await import("ethers");
  const epochDuration = await core.epochDuration();

  const [createCommitmentsTxsErrors, createCommitmentsTxs] =
    splitErrorsAndResults(
      await Promise.all(
        computePeers.map(async ({ peerId, capacityCommitment, name }) => {
          let peerIdUint8Arr;

          try {
            peerIdUint8Arr = await peerIdToUint8Array(peerId);
          } catch (e) {
            return {
              error: `Invalid peerId: ${peerId}. Error: ${stringifyUnknown(e)}`,
            };
          }

          const durationInSec = BigInt(
            (parse(capacityCommitment.duration) ?? 0) / 1000,
          );

          dbg(
            `initTimestamp: ${await core.initTimestamp()} Epoch duration: ${epochDuration.toString()}. Current epoch: ${await core.currentEpoch()}`,
          );

          dbg(`Duration in seconds: ${durationInSec.toString()}`);
          const durationEpoch = durationInSec / epochDuration;
          dbg(`Duration in epochs: ${durationEpoch.toString()}`);
          const ccDelegator = capacityCommitment.delegator;

          const minDuration = await capacity.minDuration();

          if (durationEpoch < minDuration) {
            return {
              error: `Duration for ${color.yellow(
                name,
              )} must be at least ${color.yellow(
                minDuration * epochDuration,
              )} seconds. Got: ${color.yellow(durationInSec)} seconds`,
            };
          }

          const ccRewardDelegationRate = Math.floor(
            (capacityCommitment.rewardDelegationRate / 100) * Number(precision),
          );

          return {
            result: [
              capacity.createCommitment,
              peerIdUint8Arr,
              durationEpoch,
              ccDelegator ?? ethers.ZeroAddress,
              ccRewardDelegationRate,
            ] as const,
          };
        }),
      ),
      (val) => {
        return val;
      },
    );

  if (createCommitmentsTxsErrors.length > 0) {
    return commandObj.error(
      `Failed to create commitments for some of the compute peers:\n${createCommitmentsTxsErrors.join(
        "\n",
      )}`,
    );
  }

  let createCommitmentsTxReceipts;

  try {
    createCommitmentsTxReceipts = await signBatch(
      createCommitmentsTxs.map((tx) => {
        return [...tx];
      }),
    );
  } catch (e) {
    const errorString = stringifyUnknown(e);

    if (errorString.includes("Peer doesn't exist")) {
      return commandObj.error(
        `\n\nNot able to find peers on chain. Make sure you used '${CLI_NAME} provider offer-create' command to create offers that contain the peers you selected right now:\n\n${computePeers
          .map(({ name, peerId }) => {
            return `Name: ${name}\nPeerId: ${peerId}`;
          })
          .join("\n\n")}`,
      );
    }

    throw e;
  }

  if (createCommitmentsTxReceipts === undefined) {
    return commandObj.error(
      "The are no compute peers to create commitments for",
    );
  }

  const commitmentIds = createCommitmentsTxReceipts.flatMap((txReceipt) => {
    return getEventValues({
      txReceipt,
      contract: capacity,
      eventName: "CommitmentCreated",
      value: "commitmentId",
    });
  });

  const [notStringCommitmentIds, stringCommitmentIds] = splitErrorsAndResults(
    commitmentIds,
    (id) => {
      if (typeof id !== "string") {
        return { error: stringifyUnknown(id) };
      }

      return { result: id };
    },
  );

  if (notStringCommitmentIds.length > 0) {
    return commandObj.error(
      `Wasn't able to get id for some of the commitments. Got: ${notStringCommitmentIds.join(
        ", ",
      )}`,
    );
  }

  commandObj.logToStderr(
    color.green(
      `Commitments ${stringCommitmentIds.join(", ")} were registered`,
    ),
  );

  return stringCommitmentIds;
}

export async function removeCommitments(flags: CCFlags) {
  const commitments = await getCommitments(flags);
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();

  const [commitmentInfoErrors, commitmentInfo] = splitErrorsAndResults(
    await Promise.all(
      commitments.map(async (commitment) => {
        try {
          return {
            result: {
              commitment,
              info: await capacity.getCommitment(commitment.commitmentId),
            },
          };
        } catch (error) {
          return { error: { commitment, error } };
        }
      }),
    ),
    (res) => {
      return res;
    },
  );

  if (commitmentInfoErrors.length > 0) {
    commandObj.error(
      `Wasn't able to get commitments from chain:\n${commitmentInfoErrors
        .map(({ commitment, error }) => {
          return `${stringifyBasicCommitmentInfo(commitment)}\n\n${color.red(
            stringifyUnknown(error),
          )}`;
        })
        .join("\n\n")}`,
    );
  }

  const commitmentsWithInvalidStatus = commitmentInfo.filter(({ info }) => {
    return ccStatusToString(info.status) !== "WaitDelegation";
  });

  if (commitmentsWithInvalidStatus.length > 0) {
    commandObj.error(
      `You can remove commitments only if they have WaitDelegation status. Got:\n\n${commitmentsWithInvalidStatus
        .map(({ commitment, info }) => {
          return `${stringifyBasicCommitmentInfo(
            commitment,
          )}Status: ${ccStatusToString(info.status)}`;
        })
        .join("\n\n")}`,
    );
  }

  await signBatch(
    commitments.map(({ commitmentId }) => {
      return [capacity.removeCommitment, commitmentId];
    }),
  );

  commandObj.logToStderr(
    `Removed commitments:\n\n${commitments
      .map((commitment) => {
        return stringifyBasicCommitmentInfo(commitment);
      })
      .join("\n")}`,
  );
}

function stringifyBasicCommitmentInfo(
  commitment: Awaited<ReturnType<typeof getCommitments>>[number],
) {
  if ("providerConfigComputePeer" in commitment) {
    return `${color.yellow(
      `Nox: ${commitment.providerConfigComputePeer.name}`,
    )}\n${yamlDiffPatch(
      "",
      {},
      {
        PeerId: commitment.providerConfigComputePeer.peerId,
        CommitmentId: commitment.commitmentId,
      },
    )}`;
  }

  return color.yellow(`CommitmentId: ${commitment.commitmentId}`);
}

export function ccStatusToString(status: bigint | undefined) {
  return (
    (
      [
        "Active",
        "WaitDelegation",
        "WaitStart",
        "Inactive",
        "Failed",
        "Removed",
      ] as const
    )[Number(status)] ?? "Unknown"
  );
}
