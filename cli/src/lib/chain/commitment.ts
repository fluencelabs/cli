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

import { CommitmentStatus, type ICapacity } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import isUndefined from "lodash-es/isUndefined.js";
import omitBy from "lodash-es/omitBy.js";
import parse from "parse-duration";
import { yamlDiffPatch } from "yaml-diff-patch";

import { jsonStringify } from "../../common.js";
import { commandObj } from "../commandObj.js";
import { initReadonlyProviderConfig } from "../configs/project/provider.js";
import {
  CLI_NAME,
  NOX_NAMES_FLAG_NAME,
  OFFER_FLAG_NAME,
  CC_IDS_FLAG_NAME,
  FINISH_COMMITMENT_FLAG_NAME,
} from "../const.js";
import { dbg } from "../dbg.js";
import {
  batchRead,
  getContracts,
  getEventValues,
  signBatch,
  populateTx,
  getReadonlyContracts,
  sign,
  getDealExplorerClient,
} from "../dealClient.js";
import { bigintSecondsToDate } from "../helpers/bigintOps.js";
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
  peerIdBase58ToUint8Array,
} from "./conversions.js";
import { fltFormatWithSymbol } from "./currencies.js";

const HUNDRED_PERCENT = 100;

export type ComputePeersWithCC = Awaited<
  ReturnType<typeof getComputePeersWithCC>
>;

export async function getComputePeersWithCC(
  computePeers: ResolvedComputePeer[],
) {
  const { readonlyContracts } = await getReadonlyContracts();

  const commitmentCreatedEvents = Object.fromEntries(
    await Promise.all(
      (
        await readonlyContracts.diamond.queryFilter(
          readonlyContracts.diamond.filters.CommitmentCreated,
        )
      ).map(async (event) => {
        return [
          await peerIdHexStringToBase58String(event.args.peerId),
          event,
        ] as const;
      }),
    ),
  );

  const { ZeroHash } = await import("ethers");

  const computePeersWithChainInfo = (
    await Promise.all(
      computePeers.map(async (computePeer) => {
        const peerIdUint8Array = await peerIdBase58ToUint8Array(
          computePeer.peerId,
        );

        const commitmentCreatedEvent =
          commitmentCreatedEvents[computePeer.peerId];

        const marketGetComputePeerRes = await (async () => {
          try {
            return await readonlyContracts.diamond.getComputePeer(
              peerIdUint8Array,
            );
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

    if (commitmentId === undefined || commitmentId === ZeroHash) {
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
  [CC_IDS_FLAG_NAME]?: string | undefined;
};

export async function getCommitments(
  flags: CCFlags,
): Promise<{ commitmentId: string }[] | ComputePeersWithCC> {
  if (flags[CC_IDS_FLAG_NAME] !== undefined) {
    return commaSepStrToArr(flags[CC_IDS_FLAG_NAME]).map((commitmentId) => {
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
  const { contracts } = await getContracts();
  const precision = await contracts.diamond.precision();
  const { ZeroAddress } = await import("ethers");
  const epochDuration = await contracts.diamond.epochDuration();

  const [createCommitmentsTxsErrors, createCommitmentsTxs] =
    splitErrorsAndResults(
      await Promise.all(
        computePeers.map(async ({ peerId, capacityCommitment, name }) => {
          let peerIdUint8Arr;

          try {
            peerIdUint8Arr = await peerIdBase58ToUint8Array(peerId);
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
              await contracts.diamond.initTimestamp(),
            )} Epoch duration: ${bigintToStr(
              epochDuration,
            )}. Current epoch: ${bigintToStr(await contracts.diamond.currentEpoch())}`,
          );

          dbg(`Duration in seconds: ${bigintToStr(durationInSec)}`);
          const durationEpoch = durationInSec / epochDuration;
          dbg(`Duration in epochs: ${bigintToStr(durationEpoch)}`);
          const ccDelegator = capacityCommitment.delegator;

          const minDuration = await contracts.diamond.minDuration();

          if (durationEpoch < minDuration) {
            return {
              error: `Duration for ${color.yellow(
                name,
              )} must be at least ${color.yellow(
                minDuration * epochDuration,
              )} seconds. Got: ${color.yellow(durationInSec)} seconds`,
            };
          }

          const ccStakerReward = Math.floor(
            (capacityCommitment.stakerReward / HUNDRED_PERCENT) *
              Number(precision),
          );

          return {
            result: populateTx(
              contracts.diamond.createCommitment,
              peerIdUint8Arr,
              durationEpoch,
              ccDelegator ?? ZeroAddress,
              ccStakerReward,
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
    createCommitmentsTxReceipts = await signBatch(
      `Create commitments for the following noxes:\n\n${computePeers
        .map(({ name, peerId }) => {
          return `Nox: ${name}\nPeerId: ${peerId}`;
        })
        .join("\n\n")}`,
      createCommitmentsTxs,
    );
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
      contract: contracts.diamond,
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
  const { contracts } = await getContracts();

  const [commitmentInfoErrors, commitmentInfo] = splitErrorsAndResults(
    await Promise.all(
      commitments.map(async (commitment) => {
        try {
          return {
            result: {
              commitment,
              info: await contracts.diamond.getCommitment(
                commitment.commitmentId,
              ),
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
    `Remove the following commitments:\n\n${commitments
      .map((commitment) => {
        return stringifyBasicCommitmentInfo(commitment);
      })
      .join("\n\n")}`,
    commitments.map(({ commitmentId }) => {
      return populateTx(contracts.diamond.removeCommitment, commitmentId);
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

export async function collateralWithdraw(
  flags: CCFlags & {
    [FINISH_COMMITMENT_FLAG_NAME]?: boolean;
  },
) {
  const { ZeroAddress } = await import("ethers");
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

  const { contracts } = await getContracts();

  for (const commitment of commitments.flatMap(({ ccInfos }) => {
    return ccInfos;
  })) {
    const { commitmentId, noxName } = commitment;

    const [unitIds, isExitedStatuses] =
      await contracts.diamond.getUnitExitStatuses(commitmentId);

    const units = await batchRead(
      unitIds.map((unitId, i) => {
        return async () => {
          return {
            unitId,
            unitInfo: await contracts.diamond.getComputeUnit(unitId),
            isExited:
              isExitedStatuses[i] ??
              (() => {
                throw new Error(
                  `Unreachable. No exit status returned from getUnitExitStatuses for unit ${unitId}`,
                );
              })(),
          };
        };
      }),
    );

    const unitsWithDeals = units.filter((unit) => {
      return unit.unitInfo.deal !== ZeroAddress;
    });

    const unitIdsByOnChainWorkerId: Record<string, string[]> = {};

    for (const { unitId, unitInfo } of unitsWithDeals) {
      let unitIds = unitIdsByOnChainWorkerId[unitInfo.onchainWorkerId];

      if (unitIds === undefined) {
        unitIds = [];
        unitIdsByOnChainWorkerId[unitInfo.onchainWorkerId] = unitIds;
      }

      unitIds.push(unitId);
    }

    const moveResourcesFromDealTxs = Object.entries(
      unitIdsByOnChainWorkerId,
    ).flatMap(([onchainWorkerId, unitIds]) => {
      return unitIds.map((unit) => {
        return populateTx(
          contracts.diamond.moveResourcesFromDeal,
          [unit],
          onchainWorkerId,
        );
      });
    });

    const dealsString = Array.from(
      new Set(
        unitsWithDeals.map(({ unitInfo }) => {
          return unitInfo.deal;
        }),
      ),
    ).join("\n");

    try {
      await signBatch(
        `Moving resources from the following deals:\n${dealsString}`,
        moveResourcesFromDealTxs,
      );
    } catch (e) {
      commandObj.warn(
        `Wasn't able to move resources from deals for ${stringifyBasicCommitmentInfo(commitment)}. Most likely the reason is you must wait until the provider exits from all the following deals:\n${dealsString}`,
      );

      dbg(stringifyUnknown(e));
      continue;
    }

    await sign({
      title: `withdraw collateral from: ${commitment.commitmentId}`,
      method: contracts.diamond.withdrawCollateral,
      args: [commitmentId],
    });

    commandObj.logToStderr(
      `Collateral withdrawn for:\n${stringifyBasicCommitmentInfo(commitment)}`,
    );

    const shouldFinishCommitment = flags[FINISH_COMMITMENT_FLAG_NAME] ?? true; // for provider it's true by default

    if (!shouldFinishCommitment) {
      continue;
    }

    await signBatch(
      `Remove compute units from capacity commitments and finish commitment ${noxName === undefined ? commitmentId : `for ${noxName} (${commitmentId})`} ${commitmentId}`,
      [
        ...units
          .filter(({ isExited }) => {
            return !isExited;
          })
          .map(({ unitId }) => {
            return populateTx(contracts.diamond.removeCUFromCC, commitmentId, [
              unitId,
            ]);
          }),
        populateTx(contracts.diamond.finishCommitment, commitmentId),
      ],
    );
  }
}

export async function collateralRewardWithdraw(flags: CCFlags) {
  const commitments = await getCommitments(flags);
  const { contracts } = await getContracts();

  // TODO: add logs here
  await signBatch(
    `Withdraw rewards for commitments:\n\n${commitments
      .map(({ commitmentId }) => {
        return commitmentId;
      })
      .join("\n")}`,
    commitments.map(({ commitmentId }) => {
      return populateTx(contracts.diamond.withdrawReward, commitmentId);
    }),
  );
}

export function stringifyBasicCommitmentInfo(
  commitment:
    | Awaited<ReturnType<typeof getCommitments>>[number]
    | Awaited<ReturnType<typeof getCommitmentsInfo>>[number]["ccInfos"][number],
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
  const { readonlyContracts } = await getReadonlyContracts();
  const { CommitmentStatus } = await import("@fluencelabs/deal-ts-clients");

  const [
    commitments,
    currentEpoch,
    epochDuration,
    initTimestamp,
    maxFailedRatio,
  ] = await Promise.all([
    getCommitments(flags),
    readonlyContracts.diamond.currentEpoch(),
    readonlyContracts.diamond.epochDuration(),
    readonlyContracts.diamond.initTimestamp(),
    readonlyContracts.diamond.maxFailedRatio(),
  ]);

  const dealExplorerClient = await getDealExplorerClient();

  const commitmentsInfo = await Promise.all(
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
        commitment = await readonlyContracts.diamond.getCommitment(
          c.commitmentId,
        );
      } catch (e) {
        dbg(
          `Failed to get commitment from chain ${c.commitmentId}. Error: ${stringifyUnknown(e)}`,
        );
      }

      const cuFailThreshold =
        commitment.unitCount === undefined
          ? undefined
          : maxFailedRatio * commitment.unitCount;

      let ccFromExplorer: Awaited<
        ReturnType<typeof dealExplorerClient.getCapacityCommitment>
      > = null;

      try {
        ccFromExplorer = await dealExplorerClient.getCapacityCommitment(
          c.commitmentId,
        );
      } catch (e) {
        dbg(
          `Failed to get commitment ${c.commitmentId} from explorer. Error: ${stringifyUnknown(
            e,
          )}`,
        );
      }

      const ccStartDate =
        commitment.startEpoch === undefined
          ? undefined
          : bigintSecondsToDate(
              initTimestamp + commitment.startEpoch * epochDuration,
            );

      const ccEndDate =
        commitment.endEpoch === undefined
          ? undefined
          : bigintSecondsToDate(
              initTimestamp + commitment.endEpoch * epochDuration,
            );

      const status = Number(commitment.status);

      return {
        ...("providerConfigComputePeer" in c
          ? {
              noxName: c.providerConfigComputePeer.name,
              peerId: c.providerConfigComputePeer.peerId,
            }
          : {}),
        ccFromExplorer,
        commitmentId: c.commitmentId,
        status: status in CommitmentStatus ? status : undefined,
        currentEpoch: bigintToStr(currentEpoch),
        startEpoch: optBigIntToStr(commitment.startEpoch),
        startDate: ccStartDate,
        endEpoch: optBigIntToStr(commitment.endEpoch),
        endDate: ccEndDate,
        stakerReward: await stakerRewardToString(
          commitment.rewardDelegatorRate,
        ),
        delegator: commitment.delegator,
        totalCU: optBigIntToStr(commitment.unitCount),
        failedEpoch: optBigIntToStr(commitment.failedEpoch),
        totalCUFailCount: optBigIntToStr(commitment.totalFailCount),
        cuFailThreshold: optBigIntToStr(cuFailThreshold),
        collateralPerUnit: commitment.collateralPerUnit,
        exitedUnitCount: optBigIntToStr(commitment.exitedUnitCount),
      };
    }),
  );

  // group commitments by status
  return Array.from(
    commitmentsInfo
      .reduce<
        Map<CommitmentStatus | undefined, (typeof commitmentsInfo)[number][]>
      >((acc, v) => {
        const infos = acc.get(v.status) ?? [];
        infos.push(v);

        acc.set(
          v.status !== undefined && v.status in CommitmentStatus
            ? v.status
            : undefined,
          infos,
        );

        return acc;
      }, new Map())
      .entries(),
  ).map(([status, ccInfos]) => {
    return { status, ccInfos };
  });
}

function optBigIntToStr(value: bigint | undefined) {
  return value === undefined ? undefined : bigintToStr(value);
}

async function stakerRewardToString(stakerReward: bigint | undefined) {
  if (stakerReward === undefined) {
    return undefined;
  }

  const { readonlyContracts } = await getReadonlyContracts();
  const precision = await readonlyContracts.diamond.precision();
  return `${numToStr(
    (Number(stakerReward) * HUNDRED_PERCENT) / Number(precision),
  )}%`;
}

export async function printCommitmentsInfo(flags: CCFlags) {
  const ccInfos = await getCommitmentsInfo(flags);

  commandObj.logToStderr(
    (
      await Promise.all(
        ccInfos.map(async ({ status, ccInfos }) => {
          return `${await getStatusHeading(status, ccInfos)}${(
            await Promise.all(
              ccInfos.map(async (ccInfo) => {
                const noxName =
                  ccInfo.noxName === undefined
                    ? ""
                    : color.yellow(`Nox: ${ccInfo.noxName}\n`);

                return `${noxName}${await getCommitmentInfoString(ccInfo)}`;
              }),
            )
          ).join("\n\n")}`;
        }),
      )
    ).join("\n\n"),
  );
}

async function getStatusHeading(
  status: CommitmentStatus | undefined,
  ccInfos: { noxName?: undefined | string; commitmentId: string }[],
) {
  return color.yellow(
    `Status: ${await ccStatusToString(status)} (${ccInfos
      .map(({ commitmentId, noxName }) => {
        return noxName ?? commitmentId;
      })
      .join(",")})\n\n`,
  );
}

export async function printCommitmentsInfoJSON(flags: CCFlags) {
  commandObj.log(jsonStringify(await getCommitmentsInfo(flags)));
}

async function getCommitmentInfoString(
  ccInfo: Awaited<
    ReturnType<typeof getCommitmentsInfo>
  >[number]["ccInfos"][number],
) {
  const { ZeroAddress } = await import("ethers");

  const staker =
    ccInfo.delegator ?? ccInfo.ccFromExplorer?.stakerAddress ?? undefined;

  const startEndCurrentEpoch =
    ccInfo.startEpoch === undefined || ccInfo.endEpoch === undefined
      ? undefined
      : [ccInfo.startEpoch, ccInfo.endEpoch, ccInfo.currentEpoch].join(" / ");

  const missedProofsThreshold =
    ccInfo.totalCUFailCount === undefined ||
    ccInfo.cuFailThreshold === undefined
      ? undefined
      : [ccInfo.totalCUFailCount, ccInfo.cuFailThreshold].join(" / ");

  return yamlDiffPatch(
    "",
    {},
    omitBy(
      {
        PeerId: ccInfo.peerId,
        "Capacity commitment ID": ccInfo.commitmentId,
        Status: await ccStatusToString(ccInfo.status),
        Staker:
          staker === ZeroAddress
            ? "Anyone can activate capacity commitment"
            : staker,
        "Staker reward":
          ccInfo.stakerReward === undefined ? undefined : ccInfo.stakerReward,
        "Start / End / Current epoch": startEndCurrentEpoch,
        "Start date": ccInfo.startDate?.toLocaleString(),
        "Expiration date": ccInfo.endDate?.toLocaleString(),
        "Total CU": ccInfo.totalCU,
        "Missed proofs / Threshold": missedProofsThreshold,
        "Collateral per unit":
          ccInfo.collateralPerUnit === undefined
            ? undefined
            : await fltFormatWithSymbol(ccInfo.collateralPerUnit),
        "Exited unit count": ccInfo.exitedUnitCount,
        ...(ccInfo.ccFromExplorer === null
          ? {}
          : {
              "Total CC rewards over time": await fltFormatWithSymbol(
                ccInfo.ccFromExplorer.rewards.total,
              ),
              "In vesting / Available / Total claimed (Provider)": (
                await Promise.all(
                  [
                    ccInfo.ccFromExplorer.rewards.provider.inVesting,
                    ccInfo.ccFromExplorer.rewards.provider.availableToClaim,
                    ccInfo.ccFromExplorer.rewards.provider.claimed,
                  ].map((val) => {
                    return fltFormatWithSymbol(val);
                  }),
                )
              ).join(" / "),
              "In vesting / Available / Total claimed (Staker)": (
                await Promise.all(
                  [
                    ccInfo.ccFromExplorer.rewards.staker.inVesting,
                    ccInfo.ccFromExplorer.rewards.staker.availableToClaim,
                    ccInfo.ccFromExplorer.rewards.staker.claimed,
                  ].map((val) => {
                    return fltFormatWithSymbol(val);
                  }),
                )
              ).join(" / "),
            }),
      } satisfies Record<string, string | undefined>,
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

  return statusStr === "Inactive" ? "Completed" : statusStr;
}

export async function basicCCInfoAndStatusToString(
  ccInfos: Awaited<ReturnType<typeof getCommitmentsInfo>>,
) {
  return (
    await Promise.all(
      ccInfos.map(async ({ status, ccInfos }) => {
        return `${await getStatusHeading(status, ccInfos)}${ccInfos
          .map((ccInfo) => {
            return stringifyBasicCommitmentInfo(ccInfo);
          })
          .join("\n\n")} `;
      }),
    )
  ).join("\n\n");
}
