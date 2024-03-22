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

import { type ICapacity } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import isUndefined from "lodash-es/isUndefined.js";
import omitBy from "lodash-es/omitBy.js";
import parse from "parse-duration";
import { yamlDiffPatch } from "yaml-diff-patch";

import { commandObj } from "../commandObj.js";
import {
  initReadonlyProviderConfig,
  resolveComputePeersByNames,
  type ResolvedComputePeer,
} from "../configs/project/provider.js";
import { CLI_NAME, NOX_NAMES_FLAG_NAME } from "../const.js";
import { dbg } from "../dbg.js";
import {
  getDealClient,
  getEventValues,
  signBatch,
  sign,
  getReadonlyDealClient,
} from "../dealClient.js";
import {
  splitErrorsAndResults,
  stringifyUnknown,
  commaSepStrToArr,
} from "../helpers/utils.js";
import { input } from "../prompt.js";

import {
  peerIdHexStringToBase58String,
  peerIdToUint8Array,
} from "./conversions.js";

const HUNDRED_PERCENT = 100

export type ComputePeersWithCC = Awaited<
  ReturnType<typeof getComputePeersWithCC>
>;

export async function getComputePeersWithCC(
  computePeers: ResolvedComputePeer[],
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();
  const capacity = dealClient.getCapacity();

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

        const commitmentCreatedEvent =
          commitmentCreatedEvents[computePeer.peerId];

        const marketGetComputePeerRes = await (async () => {
          try {
            return await market.getComputePeer(peerIdUint8Array);
          } catch {
            return undefined;
          }
        })();

        return {
          providerConfigComputePeer: computePeer,
          ...(commitmentCreatedEvent === undefined
            ? {}
            : {
                commitmentCreatedEvent,
              }),
          ...(marketGetComputePeerRes === undefined
            ? {}
            : {
                marketGetComputePeerRes,
              }),
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

  if (
    flags[NOX_NAMES_FLAG_NAME] === undefined &&
    (await initReadonlyProviderConfig()) === null
  ) {
    return commaSepStrToArr(
      await input({
        message: "Enter comma-separated list of Capacity Commitment IDs",
      }),
    ).map((commitmentId) => {
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
  const core = dealClient.getCore();
  const capacity = dealClient.getCapacity();
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

          const minDuration = await core.minDuration();

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
            (capacityCommitment.rewardDelegationRate / HUNDRED_PERCENT) * Number(precision),
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
    `Capacity Commitments were registered with ids:\n${color.yellow(
      stringCommitmentIds.join("\n"),
    )}`,
  );

  const commitmentInfo = await getCommitmentsInfo({
    "nox-names": computePeers
      .map(({ name }) => {
        return name;
      })
      .join(", "),
  });

  printCommitmentsInfo(commitmentInfo);
}

export async function removeCommitments(flags: CCFlags) {
  const commitments = await getCommitments(flags);
  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();

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

export async function withdrawCollateral(flags: CCFlags) {
  const commitments = await getCommitments(flags);
  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();
  const market = dealClient.getMarket();

  for (const commitment of commitments) {
    const { commitmentId } = commitment;
    const commitmentInfo = await capacity.getCommitment(commitmentId);
    const unitIds = await market.getComputeUnitIds(commitmentInfo.peerId);
    await sign(capacity.removeCUFromCC, commitmentId, [...unitIds]);
    await sign(capacity.finishCommitment, commitmentId);

    commandObj.logToStderr(
      `Collateral withdrawn for:\n${stringifyBasicCommitmentInfo(commitment)}`,
    );
  }
}

export async function withdrawCollateralRewards(flags: CCFlags) {
  const commitments = await getCommitments(flags);
  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();

  // TODO: add logs here
  await signBatch(
    commitments.map(({ commitmentId }) => {
      return [capacity.withdrawReward, commitmentId];
    }),
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
        "Inactive",
        "Active",
        "WaitDelegation",
        "WaitStart",
        "Failed",
        "Removed",
      ] as const
    )[Number(status)] ?? "Unknown"
  );
}

export async function getCommitmentsInfo(flags: CCFlags) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const capacity = readonlyDealClient.getCapacity();
  const commitments = await getCommitments(flags);
  const { ethers } = await import("ethers");

  return Promise.all(
    commitments.map(async (c) => {
      let commitment: Partial<ICapacity.CommitmentViewStructOutput> =
        "commitmentCreatedEvent" in c
          ? {
              peerId: c.commitmentCreatedEvent.args.peerId,
              rewardDelegatorRate:
                c.commitmentCreatedEvent.args.rewardDelegationRate,
              collateralPerUnit:
                c.commitmentCreatedEvent.args.fltCollateralPerUnit,
              delegator: c.commitmentCreatedEvent.args.delegator,
            }
          : {};

      try {
        commitment = await capacity.getCommitment(c.commitmentId);
      } catch {}

      return {
        ...("providerConfigComputePeer" in c
          ? {
              Nox: c.providerConfigComputePeer.name,
              PeerId: c.providerConfigComputePeer.peerId,
            }
          : {}),
        "PeerId Hex": commitment.peerId,
        "Capacity commitment ID": c.commitmentId,
        Status: ccStatusToString(commitment.status),
        "Start epoch": commitment.startEpoch?.toString(),
        "End epoch": commitment.endEpoch?.toString(),
        "Reward delegator rate": await rewardDelegationRateToString(
          commitment.rewardDelegatorRate,
        ),
        Delegator:
          commitment.delegator === ethers.ZeroAddress.toString()
            ? "Anyone can activate capacity commitment"
            : commitment.delegator,
        "Total CU": commitment.unitCount?.toString(),
        "Failed epoch": commitment.failedEpoch?.toString(),
        "Total CU Fail Count": commitment.totalFailCount?.toString(),
        "Collateral per unit": commitment.collateralPerUnit?.toString(),
        "Exited unit count": commitment.exitedUnitCount?.toString(),
      };
    }),
  );
}

async function rewardDelegationRateToString(rewardDelegatorRate: bigint | undefined) {
  if (rewardDelegatorRate === undefined) {
    return undefined;
  }

  const { readonlyDealClient } = await getReadonlyDealClient();
  const core = readonlyDealClient.getCore()
  const precision = await core.precision();
  return `${Number(rewardDelegatorRate) * HUNDRED_PERCENT / Number(precision)}%`;
}

export function printCommitmentsInfo(
  infos: Awaited<ReturnType<typeof getCommitmentsInfo>>,
) {
  for (const { Nox, ...restInfo } of infos) {
    if (Nox !== undefined) {
      commandObj.logToStderr(color.yellow(`Nox: ${Nox}`));
    }

    commandObj.logToStderr(
      yamlDiffPatch("", {}, omitBy(restInfo, isUndefined)),
    );
  }
}
