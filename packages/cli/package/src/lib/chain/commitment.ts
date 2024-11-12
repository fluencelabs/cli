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

import type { Contracts } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import parse from "parse-duration";
import { yamlDiffPatch } from "yaml-diff-patch";

import { commandObj } from "../commandObj.js";
import { initProviderConfig } from "../configs/project/provider/provider.js";
import {
  CLI_NAME,
  NOX_NAMES_FLAG_NAME,
  OFFER_FLAG_NAME,
  CC_IDS_FLAG_NAME,
  FINISH_COMMITMENT_FLAG_NAME,
} from "../const.js";
import { dbg } from "../dbg.js";
import {
  getContracts,
  getEventValues,
  signBatch,
  populateTx,
  sign,
  multicallRead,
  type MulticallReadItem,
} from "../dealClient.js";
import { ccIds, ccIdsAndStatuses, ccDetails } from "../gql/gql.js";
import type { CapacityCommitmentStatus } from "../gql/gqlGenerated.js";
import { bigintSecondsToDate } from "../helpers/bigintOps.js";
import { stringifyUnknown } from "../helpers/stringifyUnknown.js";
import { bigintToStr, numToStr } from "../helpers/typesafeStringify.js";
import { splitErrorsAndResults, commaSepStrToArr } from "../helpers/utils.js";
import { input } from "../prompt.js";
import {
  resolveComputePeersByNames,
  type ResolvedComputePeer,
} from "../resolveComputePeersByNames.js";

import {
  peerIdBase58ToUint8Array,
  peerIdBase58ToHexString,
  peerIdHexStringToBase58String,
} from "./conversions.js";
import { fltFormatWithSymbol } from "./currencies.js";

const HUNDRED_PERCENT = 100;

export type ComputePeersWithCC = Awaited<
  ReturnType<typeof getComputePeersWithCC>
>;

type CommitmentAndPeerId = { id: string; peer: { id: string } };

async function getComputePeersWithCC<T extends CommitmentAndPeerId>(
  [firstComputePeer, ...restComputePeers]: [
    ResolvedComputePeer,
    ...ResolvedComputePeer[],
  ],
  getCCByHexPeerId: (
    hexPeerIds: [string, ...string[]],
  ) => Promise<{ capacityCommitments: T[] }>,
): Promise<
  [
    {
      name: string;
      infoFromSubgraph: T;
    },
    ...{
      name: string;
      infoFromSubgraph: T;
    }[],
  ]
> {
  const computePeersWithHexPeerIds = await Promise.all([
    (async () => {
      return {
        ...firstComputePeer,
        hexPeerId: await peerIdBase58ToHexString(firstComputePeer.peerId),
      };
    })(),
    ...restComputePeers.map(async (computePeer) => {
      return {
        ...computePeer,
        hexPeerId: await peerIdBase58ToHexString(computePeer.peerId),
      };
    }),
  ]);

  const [firstComputePeerWithHexPeerId, ...restComputePeersWithHexPeerIds] =
    computePeersWithHexPeerIds;

  const { capacityCommitments } = await getCCByHexPeerId([
    firstComputePeerWithHexPeerId.hexPeerId,
    ...restComputePeersWithHexPeerIds.map(({ hexPeerId }) => {
      return hexPeerId;
    }),
  ]);

  const ccInfoByHexPeerId = capacityCommitments.reduce<Record<string, T>>(
    (acc, cc) => {
      acc[cc.peer.id] = cc;
      return acc;
    },
    {},
  );

  const { ZeroHash } = await import("ethers");

  const [computePeersWithoutCC, computePeersWithCC] = splitErrorsAndResults(
    computePeersWithHexPeerIds,
    ({ hexPeerId, name, peerId }) => {
      const infoFromSubgraph = ccInfoByHexPeerId[hexPeerId];

      return infoFromSubgraph === undefined || infoFromSubgraph.id === ZeroHash
        ? { error: { name, peerId } }
        : {
            result: { name, infoFromSubgraph } satisfies CapacityCommitment<T>,
          };
    },
  );

  if (computePeersWithoutCC.length > 0) {
    commandObj.warn(
      `Some of the commitments were not found for:\n${computePeersWithoutCC
        .map(({ name, peerId }) => {
          return `Nox: ${name}, PeerId: ${peerId}`;
        })
        .join(
          "\n",
        )}\n\nYou can create commitments using '${CLI_NAME} provider cc-create' command.`,
    );
  }

  const [firstComputePeerWithCC, ...restComputePeersWithCC] =
    computePeersWithCC;

  if (firstComputePeerWithCC === undefined) {
    return commandObj.error(
      "No compute peers with capacity commitments were found",
    );
  }

  return [firstComputePeerWithCC, ...restComputePeersWithCC];
}

async function getCCs<T extends { id: string }>(
  ccIds: [string, ...string[]],
  getCCByCCIds: (
    ccIds: [string, ...string[]],
  ) => Promise<{ capacityCommitments: T[] }>,
) {
  const { capacityCommitments } = await getCCByCCIds(ccIds);

  const ccInfoByCCId = capacityCommitments.reduce<Record<string, T>>(
    (acc, cc) => {
      acc[cc.id] = cc;
      return acc;
    },
    {},
  );

  const { ZeroHash } = await import("ethers");

  const [ccIdsWithoutInfo, ccInfos] = splitErrorsAndResults(ccIds, (ccId) => {
    const infoFromSubgraph = ccInfoByCCId[ccId];
    return infoFromSubgraph === undefined || infoFromSubgraph.id === ZeroHash
      ? { error: ccId }
      : { result: { infoFromSubgraph } satisfies CapacityCommitment<T> };
  });

  if (ccIdsWithoutInfo.length > 0) {
    commandObj.warn(
      `Some of the commitments were not found:\n${ccIdsWithoutInfo.join("\n")}`,
    );
  }

  const [firstCCInfo, ...restCCInfos] = ccInfos;

  if (firstCCInfo === undefined) {
    return commandObj.error("No commitments were found");
  }

  return [firstCCInfo, ...restCCInfos];
}

export type CCFlags = {
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
  [OFFER_FLAG_NAME]?: string | undefined;
  [CC_IDS_FLAG_NAME]?: string | undefined;
};

export async function getCommitments<
  T extends { id: string; peer: { id: string } },
>(
  flags: CCFlags,
  {
    getCCByCCId,
    getCCByHexPeerId,
  }: {
    getCCByCCId: (
      ccIds: [string, ...string[]],
    ) => Promise<{ capacityCommitments: T[] }>;
    getCCByHexPeerId: (
      hexPeerIds: [string, ...string[]],
    ) => Promise<{ capacityCommitments: T[] }>;
  },
): Promise<[CapacityCommitment<T>, ...CapacityCommitment<T>[]]> {
  if (flags[CC_IDS_FLAG_NAME] !== undefined) {
    const [firstCCId, ...restCCIds] = commaSepStrToArr(flags[CC_IDS_FLAG_NAME]);

    if (firstCCId === undefined) {
      return commandObj.error("No commitment ids specified");
    }

    const [firstCC, ...restCCs] = await getCCs(
      [firstCCId, ...restCCIds],
      getCCByCCId,
    );

    if (firstCC === undefined) {
      return commandObj.error("No commitment ids specified");
    }

    return [firstCC, ...restCCs];
  }

  if (
    flags[NOX_NAMES_FLAG_NAME] === undefined &&
    (await initProviderConfig()) === null
  ) {
    const [firstCCId, ...restCCIds] = commaSepStrToArr(
      await input({
        message: "Enter comma-separated list of Capacity Commitment IDs",
        validate(val: string) {
          return (
            commaSepStrToArr(val).length > 0 ||
            "Please enter at least one commitment id"
          );
        },
      }),
    );

    if (firstCCId === undefined) {
      return commandObj.error("No commitment ids provided");
    }

    const [firstCC, ...restCCs] = await getCCs(
      [firstCCId, ...restCCIds],
      getCCByCCId,
    );

    if (firstCC === undefined) {
      return commandObj.error("No commitment ids specified");
    }

    return [firstCC, ...restCCs];
  }

  return getComputePeersWithCC(
    await resolveComputePeersByNames(flags),
    getCCByHexPeerId,
  );
}

export async function createCommitments(flags: {
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
      `Failed to populate transactions to create commitments for some of the compute peers:\n${createCommitmentsTxsErrors.join(
        "\n",
      )}`,
    );
  }

  const [firstCommitmentTx, ...restCommitmentTxs] = createCommitmentsTxs;

  if (firstCommitmentTx === undefined) {
    throw new Error(
      "Unreachable. First commitment tx can't be undefined cause it is checked in resolveComputePeersByNames",
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
      [firstCommitmentTx, ...restCommitmentTxs],
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
      `Wasn't able to get ids for some of the commitments. Got: ${notStringCommitmentIds.join(
        ", ",
      )}`,
    );
  }

  commandObj.logToStderr(
    `Capacity Commitments were registered with ids:\n${color.yellow(
      stringCommitmentIds.join("\n"),
    )}`,
  );

  commandObj.logToStderr(
    stringifyDetailedCommitmentsInfo(
      await getDetailedCommitmentsInfoGroupedByStatus({
        "nox-names": computePeers
          .map(({ name }) => {
            return name;
          })
          .join(", "),
      }),
    ),
  );
}

export async function removeCommitments(flags: CCFlags) {
  const [invalidCommitments, commitments] = splitErrorsAndResults(
    await getCommitments(flags, ccIdsAndStatuses),
    (cc) => {
      return cc.infoFromSubgraph.status === "WaitDelegation"
        ? { result: cc }
        : { error: cc };
    },
  );

  if (invalidCommitments.length > 0) {
    commandObj.warn(
      `You can remove commitments only if they have WaitDelegation status. Got:\n\n${(
        await Promise.all(
          invalidCommitments.map(async (cc) => {
            return `${await stringifyBasicCommitmentInfo(cc)}Status: ${ccStatusToString(
              cc.infoFromSubgraph.status,
            )}`;
          }),
        )
      ).join("\n\n")}`,
    );
  }

  const [firstCommitment, ...restCommitments] = commitments;

  if (firstCommitment === undefined) {
    return commandObj.error(
      "No commitments with 'WaitDelegation' status found",
    );
  }

  const { contracts } = await getContracts();

  await signBatch(
    `Remove the following commitments:\n\n${commitments
      .map((commitment) => {
        return stringifyBasicCommitmentInfo(commitment);
      })
      .join("\n\n")}`,
    [
      populateTx(
        contracts.diamond.removeCommitment,
        firstCommitment.infoFromSubgraph.id,
      ),
      ...restCommitments.map(({ infoFromSubgraph }) => {
        return populateTx(
          contracts.diamond.removeCommitment,
          infoFromSubgraph.id,
        );
      }),
    ],
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

  const [invalidCommitments, commitments] = splitErrorsAndResults(
    await getCommitmentsGroupedByStatus(flags, ccIdsAndStatuses),
    (c) => {
      return c.status === "Completed" || c.status === "Failed"
        ? { result: c }
        : { error: c };
    },
  );

  if (invalidCommitments.length > 0) {
    commandObj.warn(
      `You can withdraw collateral only from commitments with "Inactive" or "Failed" status. The following commitments have invalid status:\n\n${basicCCInfoAndStatusToString(
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
    const {
      infoFromSubgraph: { id: commitmentId },
      name: noxName,
    } = commitment;

    const [unitIds, isExitedStatuses] =
      await contracts.diamond.getUnitExitStatuses(commitmentId);

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const computeUnitInfos = (await multicallRead(
      unitIds.map((unitId): MulticallReadItem => {
        return {
          target: contracts.deployment.diamond,
          callData: contracts.diamond.interface.encodeFunctionData(
            "getComputeUnit",
            [unitId],
          ),
          decode(returnData) {
            return contracts.diamond.interface.decodeFunctionResult(
              "getComputeUnit",
              returnData,
            );
          },
        };
      }),
    )) as Awaited<ReturnType<typeof contracts.diamond.getComputeUnit>>[];

    const units = unitIds.map((unitId, i) => {
      return {
        unitId,
        unitInfo:
          computeUnitInfos[i] ??
          (() => {
            throw new Error(
              `Unreachable. Unit ${unitId} not found after running getComputeUnit`,
            );
          })(),
        isExited:
          isExitedStatuses[i] ??
          (() => {
            throw new Error(
              `Unreachable. No exit status returned from getUnitExitStatuses for unit ${unitId}`,
            );
          })(),
      };
    });

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

    const [firstMoveResourcesFromDealTx, ...restMoveResourcesFromDealTxs] =
      moveResourcesFromDealTxs;

    const dealsString = Array.from(
      new Set(
        unitsWithDeals.map(({ unitInfo }) => {
          return unitInfo.deal;
        }),
      ),
    ).join("\n");

    if (firstMoveResourcesFromDealTx !== undefined) {
      try {
        await signBatch(
          `Moving resources from the following deals:\n${dealsString}`,
          [firstMoveResourcesFromDealTx, ...restMoveResourcesFromDealTxs],
        );
      } catch (e) {
        commandObj.warn(
          `Wasn't able to move resources from deals for ${await stringifyBasicCommitmentInfo(commitment)}. Most likely the reason is you must wait until the provider exits from all the following deals:\n${dealsString}`,
        );

        dbg(stringifyUnknown(e));
        continue;
      }
    }

    await sign({
      title: `withdraw collateral from: ${commitmentId}`,
      method: contracts.diamond.withdrawCollateral,
      args: [commitmentId],
    });

    commandObj.logToStderr(
      `Collateral withdrawn for:\n${await stringifyBasicCommitmentInfo(commitment)}`,
    );

    const shouldFinishCommitment = flags[FINISH_COMMITMENT_FLAG_NAME] ?? true; // for provider it's true by default

    if (!shouldFinishCommitment) {
      continue;
    }

    const [firstNotExitedUnit, ...restNotExitedUnits] = units.filter(
      ({ isExited }) => {
        return !isExited;
      },
    );

    await signBatch(
      `${firstNotExitedUnit === undefined ? "F" : "Remove compute units from capacity commitments and f"}inish commitment ${noxName === undefined ? commitmentId : `for ${noxName} (${commitmentId})`} ${commitmentId}`,
      firstNotExitedUnit === undefined
        ? [populateTx(contracts.diamond.finishCommitment, commitmentId)]
        : [
            populateTx(contracts.diamond.removeCUFromCC, commitmentId, [
              firstNotExitedUnit.unitId,
            ]),
            ...restNotExitedUnits.map(({ unitId }) => {
              return populateTx(
                contracts.diamond.removeCUFromCC,
                commitmentId,
                [unitId],
              );
            }),
            populateTx(contracts.diamond.finishCommitment, commitmentId),
          ],
    );
  }
}

export async function collateralRewardWithdraw(flags: CCFlags) {
  const commitments = await getCommitments(flags, ccIds);
  const [firstCommitment, ...restCommitments] = commitments;
  const { contracts } = await getContracts();

  await signBatch(
    `Withdraw rewards for commitments:\n\n${commitments
      .map(({ infoFromSubgraph: { id } }) => {
        return id;
      })
      .join("\n")}`,
    [
      populateTx(
        contracts.diamond.withdrawReward,
        firstCommitment.infoFromSubgraph.id,
      ),
      ...restCommitments.map(({ infoFromSubgraph: { id } }) => {
        return populateTx(contracts.diamond.withdrawReward, id);
      }),
    ],
  );
}

export async function stringifyBasicCommitmentInfo<
  T extends CommitmentAndPeerId,
>({ name, infoFromSubgraph }: CapacityCommitment<T>) {
  const peerId = await peerIdHexStringToBase58String(infoFromSubgraph.peer.id);
  const noxName = name === undefined ? "" : `Nox: ${name}\n`;
  return `${color.yellow(`${noxName}PeerId: ${peerId}`)}\nCommitmentId: ${infoFromSubgraph.id}`;
}

type StatusCommitmentAndPeerId = CommitmentAndPeerId & {
  status?: CapacityCommitmentStatus | null;
};

type CapacityCommitment<T extends { id: string }> = {
  infoFromSubgraph: T;
  name?: string;
};

type CommitmentGroupedByStatus<T extends StatusCommitmentAndPeerId> = {
  status: ReturnType<typeof ccStatusToString>;
  ccInfos: CapacityCommitment<T>[];
}[];

export async function getCommitmentsGroupedByStatus<
  T extends StatusCommitmentAndPeerId,
>(
  ...args: Parameters<typeof getCommitments<T>>
): Promise<CommitmentGroupedByStatus<T>> {
  return Array.from(
    (await getCommitments(...args))
      .reduce<Map<CapacityCommitmentStatusString, CapacityCommitment<T>[]>>(
        (acc, v) => {
          const status = ccStatusToString(v.infoFromSubgraph.status);
          const infos = acc.get(status) ?? [];
          infos.push(v);
          acc.set(status, infos);
          return acc;
        },
        new Map(),
      )
      .entries(),
  ).map(([status, ccInfos]) => {
    return { status, ccInfos };
  });
}

function stakerRewardToString(stakerReward: bigint, precision: bigint) {
  return `${numToStr(
    (Number(stakerReward) * HUNDRED_PERCENT) / Number(precision),
  )}%`;
}

function getRewardsMulticallReads(
  commitmentId: string,
  diamondContract: Contracts["diamond"],
  diamondContractAddress: string,
): MulticallReadItem[] {
  return [
    {
      target: diamondContractAddress,
      callData: diamondContract.interface.encodeFunctionData(
        "unlockedRewards",
        [commitmentId],
      ),
      decode(returnData) {
        return diamondContract.interface.decodeFunctionResult(
          "unlockedRewards",
          returnData,
        );
      },
    },
    {
      target: diamondContractAddress,
      callData: diamondContract.interface.encodeFunctionData("totalRewards", [
        commitmentId,
      ]),
      decode(returnData) {
        return diamondContract.interface.decodeFunctionResult(
          "totalRewards",
          returnData,
        );
      },
    },
  ];
}

export async function getDetailedCommitmentsInfoGroupedByStatus(
  flags: CCFlags,
) {
  const ccGroupedByStatus = await getCommitmentsGroupedByStatus(
    flags,
    ccDetails,
  );

  const { contracts } = await getContracts();

  const allCCIds = ccGroupedByStatus.flatMap(({ ccInfos }) => {
    return ccInfos.map(({ infoFromSubgraph: { id } }) => {
      return id;
    });
  });

  const rewardsMulticallReads = allCCIds.flatMap((id) => {
    return getRewardsMulticallReads(
      id,
      contracts.diamond,
      contracts.deployment.diamond,
    );
  });

  const contractReadsPerCC = rewardsMulticallReads.length / allCCIds.length;

  const [
    currentEpoch,
    epochDuration,
    initTimestamp,
    maxFailedRatio,
    precision,
    ...rewards
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  ] = (await multicallRead([
    {
      target: contracts.deployment.diamond,
      callData: contracts.diamond.interface.encodeFunctionData("currentEpoch"),
      decode(returnData) {
        return contracts.diamond.interface.decodeFunctionResult(
          "currentEpoch",
          returnData,
        );
      },
    },
    {
      target: contracts.deployment.diamond,
      callData: contracts.diamond.interface.encodeFunctionData("epochDuration"),
      decode(returnData) {
        return contracts.diamond.interface.decodeFunctionResult(
          "epochDuration",
          returnData,
        );
      },
    },
    {
      target: contracts.deployment.diamond,
      callData: contracts.diamond.interface.encodeFunctionData("initTimestamp"),
      decode(returnData) {
        return contracts.diamond.interface.decodeFunctionResult(
          "initTimestamp",
          returnData,
        );
      },
    },
    {
      target: contracts.deployment.diamond,
      callData:
        contracts.diamond.interface.encodeFunctionData("maxFailedRatio"),
      decode(returnData) {
        return contracts.diamond.interface.decodeFunctionResult(
          "maxFailedRatio",
          returnData,
        );
      },
    },
    {
      target: contracts.deployment.diamond,
      callData: contracts.diamond.interface.encodeFunctionData("precision"),
      decode(returnData) {
        return contracts.diamond.interface.decodeFunctionResult(
          "precision",
          returnData,
        );
      },
    },
    ...ccGroupedByStatus.flatMap(({ ccInfos }) => {
      return ccInfos.flatMap(({ infoFromSubgraph: { id } }) => {
        return getRewardsMulticallReads(
          id,
          contracts.diamond,
          contracts.deployment.diamond,
        );
      });
    }),
  ])) as [
    Awaited<ReturnType<typeof contracts.diamond.currentEpoch>>,
    Awaited<ReturnType<typeof contracts.diamond.epochDuration>>,
    Awaited<ReturnType<typeof contracts.diamond.initTimestamp>>,
    Awaited<ReturnType<typeof contracts.diamond.maxFailedRatio>>,
    Awaited<ReturnType<typeof contracts.diamond.precision>>,
    ...Awaited<
      ReturnType<
        | typeof contracts.diamond.unlockedRewards
        | typeof contracts.diamond.totalRewards
      >
    >[],
  ];

  let rewardsCounter = -contractReadsPerCC;

  return Promise.all(
    ccGroupedByStatus.map(async (groupedCCs) => {
      return {
        statusInfo: groupedCCs,
        CCs: await Promise.all(
          groupedCCs.ccInfos.map(async (cc) => {
            rewardsCounter = rewardsCounter + contractReadsPerCC;

            return getDetailedCommitmentInfo({
              ...cc,
              currentEpoch,
              epochDuration,
              initTimestamp,
              maxFailedRatio,
              precision,
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              unlockedRewards: rewards[rewardsCounter] as Awaited<
                ReturnType<typeof contracts.diamond.unlockedRewards>
              >,
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              totalRewards: rewards[rewardsCounter + 1] as Awaited<
                ReturnType<typeof contracts.diamond.unlockedRewards>
              >,
            });
          }),
        ),
      };
    }),
  );
}

export function stringifyDetailedCommitmentsInfo(
  detailedCommitmentsInfoGroupedByStatus: Awaited<
    ReturnType<typeof getDetailedCommitmentsInfoGroupedByStatus>
  >,
) {
  return detailedCommitmentsInfoGroupedByStatus
    .map(({ statusInfo, CCs }) => {
      return `${getStatusHeading(statusInfo)}${CCs.map((cc) => {
        const noxNameString =
          "noxName" in cc ? color.yellow(`Nox: ${cc.noxName}\n`) : "";

        return `${noxNameString}${getDetailedCommitmentInfoString(cc)}`;
      }).join("\n\n")}`;
    })
    .join("\n\n");
}

function getStatusHeading<T extends StatusCommitmentAndPeerId>(
  cc: CommitmentGroupedByStatus<T>[number],
) {
  return color.yellow(
    `Status: ${cc.status} (${cc.ccInfos
      .map(({ infoFromSubgraph: { id }, name }) => {
        return name ?? id;
      })
      .join(",")})\n\n`,
  );
}

type DetailedCCInfo = Awaited<
  ReturnType<
    typeof getCommitmentsGroupedByStatus<
      Awaited<
        ReturnType<(typeof ccDetails)["getCCByCCId"]>
      >["capacityCommitments"][number]
    >
  >
>[number]["ccInfos"][number];

async function getDetailedCommitmentInfo({
  infoFromSubgraph: {
    id: commitmentId,
    status,
    startEpoch,
    endEpoch,
    delegator,
    computeUnitsCount,
    totalFailCount,
    collateralPerUnit,
    exitedUnitCount,
    rewardDelegatorRate,
    ccRewardsWithdrawn,
    dealStakerRewardsWithdrawn,
    peer: { id: peerId },
  },
  name: noxName,
  currentEpoch,
  epochDuration,
  initTimestamp,
  maxFailedRatio,
  precision,
  totalRewards,
  unlockedRewards,
}: DetailedCCInfo & {
  currentEpoch: bigint;
  epochDuration: bigint;
  initTimestamp: bigint;
  maxFailedRatio: bigint;
  precision: bigint;
  totalRewards: Rewards;
  unlockedRewards: Rewards;
}) {
  const rewardDelegatorRateBigInt = BigInt(rewardDelegatorRate);

  const totalRewardsSplit = splitRewards(
    totalRewards,
    rewardDelegatorRateBigInt,
    precision,
  );

  const unlockedRewardsSplit = splitRewards(
    unlockedRewards,
    rewardDelegatorRateBigInt,
    precision,
  );

  const withdrawnRewardsSplit = splitRewards(
    {
      ccRewards: BigInt(ccRewardsWithdrawn),
      dealStakerRewards: BigInt(dealStakerRewardsWithdrawn),
    },
    rewardDelegatorRateBigInt,
    precision,
  );

  return {
    ...(noxName === undefined ? {} : { noxName }),
    peerId: await peerIdHexStringToBase58String(peerId),
    commitmentId,
    status: ccStatusToString(status),
    staker:
      delegator?.id === (await import("ethers")).ZeroAddress
        ? "Anyone can activate capacity commitment"
        : (delegator?.id ?? "Unknown"),
    stakerReward: stakerRewardToString(rewardDelegatorRateBigInt, precision),
    startEpoch,
    endEpoch,
    currentEpoch: bigintToStr(currentEpoch),
    startDate: bigintSecondsToDate(
      initTimestamp + BigInt(startEpoch) * epochDuration,
    ).toLocaleString(),
    expirationDate: bigintSecondsToDate(
      initTimestamp + BigInt(endEpoch) * epochDuration,
    ).toLocaleString(),
    totalCU: numToStr(computeUnitsCount),
    missedProofs: numToStr(totalFailCount),
    threshold: bigintToStr(maxFailedRatio * BigInt(computeUnitsCount)),
    collateralPerUnit: await fltFormatWithSymbol(BigInt(collateralPerUnit)),
    exitedUnitCount: numToStr(exitedUnitCount),
    totalCCRewardsOverTime: await fltFormatWithSymbol(
      BigInt(totalRewards.ccRewards) + BigInt(totalRewards.dealStakerRewards),
    ),
    providerRewardsInVesting: await fltFormatWithSymbol(
      totalRewardsSplit.provider - unlockedRewardsSplit.provider,
    ),
    providerRewardsAvailable: await fltFormatWithSymbol(
      unlockedRewardsSplit.provider,
    ),
    providerRewardsTotalClaimed: await fltFormatWithSymbol(
      withdrawnRewardsSplit.provider,
    ),
    stakerRewardsInVesting: await fltFormatWithSymbol(
      totalRewardsSplit.staker - unlockedRewardsSplit.staker,
    ),
    stakerRewardsAvailable: await fltFormatWithSymbol(
      unlockedRewardsSplit.staker,
    ),
    stakerRewardsTotalClaimed: await fltFormatWithSymbol(
      withdrawnRewardsSplit.staker,
    ),
  } satisfies Record<string, string>;
}

function getDetailedCommitmentInfoString(
  detailedCommitmentInfo: Awaited<ReturnType<typeof getDetailedCommitmentInfo>>,
) {
  return yamlDiffPatch(
    "",
    {},
    {
      PeerId: detailedCommitmentInfo.peerId,
      "Capacity commitment ID": detailedCommitmentInfo.commitmentId,
      Status: detailedCommitmentInfo.status,
      Staker: detailedCommitmentInfo.staker,
      "Staker reward": detailedCommitmentInfo.stakerReward,
      "Start / End / Current epoch": [
        detailedCommitmentInfo.startEpoch,
        detailedCommitmentInfo.endEpoch,
        detailedCommitmentInfo.currentEpoch,
      ].join(" / "),
      "Start date": detailedCommitmentInfo.startDate,
      "Expiration date": detailedCommitmentInfo.expirationDate,
      "Total CU": detailedCommitmentInfo.totalCU,
      "Missed proofs / Threshold": [
        detailedCommitmentInfo.missedProofs,
        detailedCommitmentInfo.threshold,
      ].join(" / "),
      "Collateral per unit": detailedCommitmentInfo.collateralPerUnit,
      "Exited unit count": detailedCommitmentInfo.exitedUnitCount,
      "Total CC rewards over time":
        detailedCommitmentInfo.totalCCRewardsOverTime,
      "In vesting / Available / Total claimed (Provider)": [
        detailedCommitmentInfo.providerRewardsInVesting,
        detailedCommitmentInfo.providerRewardsAvailable,
        detailedCommitmentInfo.providerRewardsTotalClaimed,
      ].join(" / "),
      "In vesting / Available / Total claimed (Staker)": [
        detailedCommitmentInfo.stakerRewardsInVesting,
        detailedCommitmentInfo.stakerRewardsAvailable,
        detailedCommitmentInfo.stakerRewardsTotalClaimed,
      ].join(" / "),
    },
  );
}

type Rewards = { ccRewards: bigint; dealStakerRewards: bigint };

function splitRewards(
  { ccRewards, dealStakerRewards }: Rewards,
  stakerRate: bigint,
  precision: bigint,
) {
  const stakerCCReward = (ccRewards * stakerRate) / precision;
  return {
    provider: ccRewards - stakerCCReward,
    staker: stakerCCReward + dealStakerRewards,
  };
}

type CapacityCommitmentStatusString =
  | "Unknown"
  | Exclude<CapacityCommitmentStatus, "Inactive">
  | "Completed";

function ccStatusToString(
  status: CapacityCommitmentStatus | null | undefined,
): CapacityCommitmentStatusString {
  if (status === undefined || status === null) {
    return "Unknown";
  }

  return status === "Inactive" ? "Completed" : status;
}

export function basicCCInfoAndStatusToString<
  T extends StatusCommitmentAndPeerId,
>(ccsGroupedByStatus: CommitmentGroupedByStatus<T>) {
  return ccsGroupedByStatus
    .map((cc) => {
      return `${getStatusHeading(cc)}${cc.ccInfos
        .map((ccInfo) => {
          return stringifyBasicCommitmentInfo(ccInfo);
        })
        .join("\n\n")} `;
    })
    .join("\n\n");
}
