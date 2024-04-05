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
import { initReadonlyProviderConfig } from "../configs/project/provider.js";
import { CLI_NAME, NOX_NAMES_FLAG_NAME, OFFER_FLAG_NAME } from "../const.js";
import { dbg } from "../dbg.js";
import {
  getDealClient,
  getEventValues,
  signBatch,
  populate,
  getReadonlyDealClient,
} from "../dealClient.js";
import { bigintToStr, numToStr } from "../helpers/typesafeStringify.js";
import {
  splitErrorsAndResults,
  stringifyUnknown,
  commaSepStrToArr,
} from "../helpers/utils.js";
import { input } from "../prompt.js";
import {
  resolveComputePeersByNames,
  type ResolvedComputePeer,
} from "../resolveComputePeersByNames.js";

import {
  peerIdHexStringToBase58String,
  peerIdToUint8Array,
} from "./conversions.js";
import { fltFormatWithSymbol } from "./currencies.js";

const HUNDRED_PERCENT = 100;

export type ComputePeersWithCC = Awaited<
  ReturnType<typeof getComputePeersWithCC>
>;

export async function getComputePeersWithCC(
  computePeers: ResolvedComputePeer[],
) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const market = readonlyDealClient.getMarket();
  const capacity = readonlyDealClient.getCapacity();

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

  const { ethers } = await import("ethers");

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

    if (commitmentId === undefined || commitmentId === ethers.ZeroHash) {
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

  if (computePeersWithCCId.length === 0) {
    return commandObj.error(
      "No compute peers with capacity commitments were found on chain.",
    );
  }

  return computePeersWithCCId;
}

export type CCFlags = {
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
  [OFFER_FLAG_NAME]?: string | undefined;
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
  [OFFER_FLAG_NAME]?: string | undefined;
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
            `initTimestamp: ${bigintToStr(
              await core.initTimestamp(),
            )} Epoch duration: ${bigintToStr(
              epochDuration,
            )}. Current epoch: ${bigintToStr(await core.currentEpoch())}`,
          );

          dbg(`Duration in seconds: ${bigintToStr(durationInSec)}`);
          const durationEpoch = durationInSec / epochDuration;
          dbg(`Duration in epochs: ${bigintToStr(durationEpoch)}`);
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
            (capacityCommitment.rewardDelegationRate / HUNDRED_PERCENT) *
              Number(precision),
          );

          return {
            result: populate(
              capacity.createCommitment,
              peerIdUint8Arr,
              durationEpoch,
              ccDelegator ?? ethers.ZeroAddress,
              ccRewardDelegationRate,
            ),
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
    createCommitmentsTxReceipts = await signBatch(createCommitmentsTxs);
  } catch (e) {
    const errorString = stringifyUnknown(e);

    if (errorString.includes("Peer doesn't exist")) {
      return commandObj.error(
        `\n\nNot able to find peers on chain. Make sure you used '${CLI_NAME} provider offer-create' command to create offers that contain ALL the peers you selected right now:\n\n${computePeers
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

  await printCommitmentsInfo({
    "nox-names": computePeers
      .map(({ name }) => {
        return name;
      })
      .join(", "),
  });
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

  const { CommitmentStatus } = await import("@fluencelabs/deal-ts-clients");

  const commitmentsWithInvalidStatus = commitmentInfo.filter(({ info }) => {
    return Number(info.status) !== Number(CommitmentStatus.WaitDelegation);
  });

  if (commitmentsWithInvalidStatus.length > 0) {
    commandObj.error(
      `You can remove commitments only if they have WaitDelegation status. Got:\n\n${commitmentsWithInvalidStatus
        .map(({ commitment, info }) => {
          return `${stringifyBasicCommitmentInfo(commitment)}Status: ${
            CommitmentStatus[Number(info.status)] ?? "Unknown"
          }`;
        })
        .join("\n\n")}`,
    );
  }

  await signBatch(
    commitments.map(({ commitmentId }) => {
      return populate(capacity.removeCommitment, commitmentId);
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
  const { CommitmentStatus } = await import("@fluencelabs/deal-ts-clients");

  const [invalidCommitments, commitments] = splitErrorsAndResults(
    await getCommitmentsInfo(flags),
    (c) => {
      if (
        c.status === CommitmentStatus.Inactive ||
        c.status === CommitmentStatus.Failed
      ) {
        return { result: c };
      }

      return { error: c };
    },
  );

  if (invalidCommitments.length > 0) {
    commandObj.warn(
      `You can withdraw collateral only from commitments with "Inactive" or "Failed" status. The following commitments have invalid status:\n\n${await basicCCInfoAndStatusToString(
        invalidCommitments,
      )}`,
    );
  }

  if (commitments.length === 0) {
    return commandObj.error(
      "No commitments with 'Inactive' or 'Failed' status found",
    );
  }

  const { dealClient } = await getDealClient();
  const capacity = dealClient.getCapacity();
  const market = dealClient.getMarket();

  for (const commitment of commitments) {
    const { commitmentId } = commitment;
    const commitmentInfo = await capacity.getCommitment(commitmentId);
    const unitIds = await market.getComputeUnitIds(commitmentInfo.peerId);

    await signBatch([
      ...unitIds.map((unitId) => {
        return populate(market.returnComputeUnitFromDeal, unitId);
      }),
      populate(capacity.removeCUFromCC, commitmentId, [...unitIds]),
      populate(capacity.finishCommitment, commitmentId),
    ]);

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
      return populate(capacity.withdrawReward, commitmentId);
    }),
  );
}

export function stringifyBasicCommitmentInfo(
  commitment:
    | Awaited<ReturnType<typeof getCommitments>>[number]
    | Awaited<ReturnType<typeof getCommitmentsInfo>>[number],
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

  if ("noxName" in commitment) {
    return `${color.yellow(`Nox: ${commitment.noxName}`)}\n${yamlDiffPatch(
      "",
      {},
      {
        PeerId: commitment.peerId,
        CommitmentId: commitment.commitmentId,
      },
    )}`;
  }

  return color.yellow(`CommitmentId: ${commitment.commitmentId}`);
}

export async function getCommitmentsInfo(flags: CCFlags) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const capacity = readonlyDealClient.getCapacity();
  const commitments = await getCommitments(flags);

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
              noxName: c.providerConfigComputePeer.name,
              peerId: c.providerConfigComputePeer.peerId,
            }
          : {}),
        peerIdHex: commitment.peerId,
        commitmentId: c.commitmentId,
        status:
          commitment.status === undefined
            ? undefined
            : Number(commitment.status),
        startEpoch: optBigIntToStr(commitment.startEpoch),
        endEpoch: optBigIntToStr(commitment.endEpoch),
        rewardDelegatorRate: await rewardDelegationRateToString(
          commitment.rewardDelegatorRate,
        ),
        delegator: commitment.delegator,
        totalCU: optBigIntToStr(commitment.unitCount),
        failedEpoch: optBigIntToStr(commitment.failedEpoch),
        totalCUFailCount: optBigIntToStr(commitment.totalFailCount),
        collateralPerUnit: commitment.collateralPerUnit,
        exitedUnitCount: optBigIntToStr(commitment.exitedUnitCount),
      };
    }),
  );
}

function optBigIntToStr(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToStr(value);
}

async function rewardDelegationRateToString(
  rewardDelegatorRate: bigint | undefined,
) {
  if (rewardDelegatorRate === undefined) {
    return undefined;
  }

  const { readonlyDealClient } = await getReadonlyDealClient();
  const core = readonlyDealClient.getCore();
  const precision = await core.precision();
  return `${numToStr(
    (Number(rewardDelegatorRate) * HUNDRED_PERCENT) / Number(precision),
  )}%`;
}

export async function printCommitmentsInfo(flags: CCFlags) {
  const ccInfos = await getCommitmentsInfo(flags);

  commandObj.logToStderr(
    (
      await Promise.all(
        ccInfos.map(async (ccInfo) => {
          const noxName =
            ccInfo.noxName === undefined
              ? ""
              : color.yellow(`Nox: ${ccInfo.noxName}\n`);

          return `${noxName}${await getCommitmentInfoString(ccInfo)}`;
        }),
      )
    ).join("\n\n"),
  );
}

export async function getCommitmentInfoString(
  ccInfo: Awaited<ReturnType<typeof getCommitmentsInfo>>[number],
) {
  const { ethers } = await import("ethers");

  return yamlDiffPatch(
    "",
    {},
    omitBy(
      {
        PeerId: ccInfo.peerId,
        "PeerId Hex": ccInfo.peerIdHex,
        "Capacity commitment ID": ccInfo.commitmentId,
        Status: await ccStatusToString(ccInfo.status),
        "Start epoch": ccInfo.startEpoch,
        "End epoch": ccInfo.endEpoch,
        "Reward delegator rate": ccInfo.rewardDelegatorRate,
        Delegator:
          ccInfo.delegator === ethers.ZeroAddress
            ? "Anyone can activate capacity commitment"
            : ccInfo.delegator,
        "Total CU": ccInfo.totalCU,
        "Failed epoch": ccInfo.failedEpoch,
        "Total CU Fail Count": ccInfo.totalCUFailCount,
        "Collateral per unit":
          ccInfo.collateralPerUnit === undefined
            ? undefined
            : await fltFormatWithSymbol(ccInfo.collateralPerUnit),
        "Exited unit count": ccInfo.exitedUnitCount,
      },
      isUndefined,
    ),
  );
}

async function ccStatusToString(status: number | undefined) {
  const { CommitmentStatus } = await import("@fluencelabs/deal-ts-clients");

  if (status === undefined) {
    return "Unknown";
  }

  const statusStr = CommitmentStatus[status];

  if (statusStr === undefined) {
    return `Unknown (${numToStr(status)})`;
  }

  return statusStr;
}

export async function basicCCInfoAndStatusToString(
  ccInfos: Awaited<ReturnType<typeof getCommitmentsInfo>>,
) {
  return (
    await Promise.all(
      ccInfos.map(async (ccInfo) => {
        return `${stringifyBasicCommitmentInfo(
          ccInfo,
        )}Status: ${await ccStatusToString(ccInfo.status)}`;
      }),
    )
  ).join("\n\n");
}
