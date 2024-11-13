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

import assert from "node:assert";

import type { MarketFacet } from "@fluencelabs/deal-ts-clients";
import { color } from "@oclif/color";
import type { Typed } from "ethers";

import { versions } from "../versions.js";

import {
  cidStringToCIDV1Struct,
  peerIdBase58ToUint8Array,
} from "./chain/conversions.js";
import { ptFormatWithSymbol, ptParse } from "./chain/currencies.js";
import { commandObj } from "./commandObj.js";
import { initNewWorkersConfigReadonly } from "./configs/project/workers.js";
import {
  DEAL_IDS_FLAG_NAME,
  DEFAULT_DEAL_ACTIVE_DURATION_FOR_LOCAL_ENV,
  DEPLOYMENT_NAMES_ARG_NAME,
} from "./const.js";
import { dbg } from "./dbg.js";
import {
  type MulticallReadItem,
  sign,
  getContracts,
  getEventValue,
  getEventValues,
  getReadonlyContracts,
  multicallRead,
} from "./dealClient.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import {
  DEFAULT_PAGE_LIMIT,
  getDealForMatching,
  getOffersForMatching,
} from "./gql/gql.js";
import type { OffersForMatchingQueryVariables } from "./gql/gqlGenerated.js";
import { setTryTimeout } from "./helpers/setTryTimeout.js";
import { stringifyUnknown } from "./helpers/stringifyUnknown.js";
import {
  bigintToStr,
  nullableToString,
  numToStr,
} from "./helpers/typesafeStringify.js";
import { commaSepStrToArr, splitErrorsAndResults } from "./helpers/utils.js";
import { checkboxes, input, list } from "./prompt.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

type DealCreateArg = {
  appCID: string;
  minWorkers: number;
  targetWorkers: number;
  maxWorkersPerProvider: number;
  pricePerCuPerEpoch: string;
  cuCountPerWorker: number;
  effectors: string[];
  initialBalance: string | undefined;
  whitelist: string[] | undefined;
  blacklist: string[] | undefined;
  protocolVersion: number | undefined;
  deploymentName?: string;
};

export async function dealCreate({
  appCID,
  minWorkers,
  targetWorkers,
  maxWorkersPerProvider,
  pricePerCuPerEpoch,
  cuCountPerWorker,
  effectors,
  initialBalance,
  whitelist,
  blacklist,
  protocolVersion,
  deploymentName,
}: DealCreateArg) {
  const { contracts } = await getContracts();
  const pricePerCuPerEpochBigInt = await ptParse(pricePerCuPerEpoch);

  const minDealDepositedEpochs =
    await contracts.diamond.minDealDepositedEpochs();

  const targetWorkersBigInt = BigInt(targetWorkers);
  const cuCountPerWorkerBigInt = BigInt(cuCountPerWorker);

  const minInitialBalanceBigInt =
    targetWorkersBigInt *
    pricePerCuPerEpochBigInt *
    minDealDepositedEpochs *
    cuCountPerWorkerBigInt;

  const initialBalanceBigInt =
    typeof initialBalance === "string"
      ? await ptParse(initialBalance)
      : await getDefaultInitialBalance(
          minInitialBalanceBigInt,
          pricePerCuPerEpochBigInt,
          targetWorkersBigInt,
          cuCountPerWorkerBigInt,
        );

  if (initialBalanceBigInt < minInitialBalanceBigInt) {
    commandObj.error(
      `${
        deploymentName === undefined ? "" : `${color.yellow(deploymentName)} :`
      }initialBalance ${color.yellow(
        initialBalance,
      )} is less than minimum initialBalance = targetWorkers * pricePerCuPerEpoch * ${bigintToStr(
        minDealDepositedEpochs,
      )} = ${color.yellow(
        await ptFormatWithSymbol(minInitialBalanceBigInt),
      )}. Please, increase initialBalance or decrease targetWorkers or pricePerCuPerEpoch`,
    );
  }

  await sign({
    title: `Approve ${await ptFormatWithSymbol(initialBalanceBigInt)} to be deposited to the deal`,
    method: contracts.usdc.approve,
    args: [contracts.deployment.diamond, initialBalanceBigInt],
  });

  const deployDealTxReceipt = await sign({
    title: `Create deal with appCID: ${appCID}`,
    method: contracts.diamond.deployDeal,
    args: [
      await cidStringToCIDV1Struct(appCID),
      contracts.deployment.usdc,
      initialBalanceBigInt,
      minWorkers,
      targetWorkers,
      cuCountPerWorker,
      maxWorkersPerProvider,
      pricePerCuPerEpochBigInt,
      await Promise.all(
        effectors.map((cid) => {
          return cidStringToCIDV1Struct(cid);
        }),
      ),
      whitelist !== undefined ? 1 : blacklist !== undefined ? 2 : 0,
      whitelist !== undefined
        ? whitelist
        : blacklist !== undefined
          ? blacklist
          : [],
      protocolVersion ?? versions.protocolVersion,
    ],
  });

  const dealId = getEventValue({
    contract: contracts.diamond,
    txReceipt: deployDealTxReceipt,
    eventName: "DealCreated",
    value: "deal",
  });

  assert(typeof dealId === "string", "dealId is not a string");
  return dealId;
}

export async function createAndMatchDealsForPeerIds({
  peerIdsFromFlags,
  ...dealCreateArgs
}: Parameters<typeof dealCreate>[0] & { peerIdsFromFlags: string }) {
  const peerIds = commaSepStrToArr(peerIdsFromFlags);
  const { contracts } = await getContracts();
  const { ZeroAddress } = await import("ethers");

  const offersWithCUs = await Promise.all(
    peerIds.map(async (peerId) => {
      const peerIdUint8Array = await peerIdBase58ToUint8Array(peerId);
      const ccIds = await contracts.diamond.getComputeUnitIds(peerIdUint8Array);

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const [{ offerId } = {}, ...computeUnitInfos] = (await multicallRead([
        {
          target: contracts.deployment.diamond,
          callData: contracts.diamond.interface.encodeFunctionData(
            "getComputePeer",
            [peerIdUint8Array],
          ),
          decode(returnData) {
            return contracts.diamond.interface.decodeFunctionResult(
              "getComputePeer",
              returnData,
            );
          },
        },
        ...ccIds.map((unitId): MulticallReadItem => {
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
      ])) as [
        (
          | Awaited<ReturnType<typeof contracts.diamond.getComputePeer>>
          | undefined
        ),
        ...(
          | Awaited<ReturnType<typeof contracts.diamond.getComputeUnit>>
          | undefined
        )[],
      ];

      assert(offerId !== undefined, "wasn't able to find offerId");

      const computeUnits = ccIds
        .map((unitId, i) => {
          return {
            unitId,
            deal:
              computeUnitInfos[i]?.deal ??
              (() => {
                throw new Error(
                  `Unreachable. Couldn't get deal for compute unit ${unitId}`,
                );
              })(),
          };
        })
        .filter(({ deal }) => {
          return deal === ZeroAddress;
        })
        .map(({ unitId }) => {
          return unitId;
        });

      return { computeUnits, offerId, peerId };
    }),
  );

  for (const { offerId, computeUnits, peerId } of offersWithCUs) {
    const CUs = computeUnits.slice(0, dealCreateArgs.cuCountPerWorker);

    if (CUs.length < dealCreateArgs.cuCountPerWorker) {
      commandObj.warn(
        `cuCountPerWorker for this deployment is ${color.yellow(dealCreateArgs.cuCountPerWorker)} but there are only ${color.yellow(CUs.length)} compute units without deals available for the peer ${color.yellow(peerId)}. Aborting deal creation for this peer`,
      );

      continue;
    }

    try {
      const dealAddress = await dealCreate({
        ...dealCreateArgs,
        targetWorkers: 1,
        minWorkers: 1,
      });

      commandObj.logToStderr(`Deal ${color.yellow(dealAddress)} created`);

      await sign({
        title: `Match deal ${dealAddress} with compute units:\n\n${CUs.join("\n")}\n\nfrom offer ${offerId}`,
        method: contracts.diamond.matchDeal,
        args: [dealAddress, [offerId], [[CUs]]],
      });

      commandObj.logToStderr(
        `Deal ${color.yellow(dealAddress)} matched with peer ${color.yellow(peerId)}. Offer: ${color.yellow(offerId)} (${color.yellow(CUs.length)} compute units)`,
      );
    } catch (e) {
      commandObj.error(
        `Couldn't create or match deal for peer ${color.yellow(peerId)}: ${stringifyUnknown(e)}`,
      );
    }
  }
}

async function getDefaultInitialBalance(
  minInitialBalanceBigInt: bigint,
  pricePerCuPerEpochBigInt: bigint,
  targetWorkersBigInt: bigint,
  cuCountPerWorker: bigint,
) {
  if ((await ensureChainEnv()) === "local") {
    const { readonlyContracts } = await getReadonlyContracts();

    const balance =
      (DEFAULT_DEAL_ACTIVE_DURATION_FOR_LOCAL_ENV /
        (await readonlyContracts.diamond.epochDuration())) *
      targetWorkersBigInt *
      pricePerCuPerEpochBigInt *
      cuCountPerWorker;

    return balance < minInitialBalanceBigInt
      ? minInitialBalanceBigInt
      : balance;
  }

  return minInitialBalanceBigInt;
}

type DealUpdateArg = {
  dealAddress: string;
  appCID: string;
};

export async function dealUpdate({ dealAddress, appCID }: DealUpdateArg) {
  const { contracts } = await getContracts();
  const deal = contracts.getDeal(dealAddress);

  await sign({
    title: `Update deal with new appCID: ${appCID}`,
    method: deal.setAppCID,
    args: [await cidStringToCIDV1Struct(appCID)],
  });
}

export async function match(dealAddress: string) {
  const { contracts } = await getContracts();
  dbg(`running getMatchedOffersByDealId with dealAddress: ${dealAddress}`);

  dbg(
    `initTimestamp: ${bigintToStr(
      await contracts.diamond.initTimestamp(),
    )} Current epoch: ${bigintToStr(await contracts.diamond.currentEpoch())}`,
  );

  const matchedOffers = await setTryTimeout(
    "get matched offers by deal id",
    () => {
      return getMatchedOffersByDealId(dealAddress);
    },
    (err) => {
      commandObj.error(
        `Wasn't able to find a match for the deal ${dealAddress}: ${stringifyUnknown(err)}`,
      );
    },
    1000 * 5, // 5 seconds
  );

  if (matchedOffers === null) {
    return commandObj.error(`No matched offers for deal ${dealAddress}`);
  }

  dbg(`got matchedOffers: ${stringifyUnknown(matchedOffers)}`);

  const matchDealTxReceipt = await sign({
    title: `Match deal ${dealAddress} with offers:\n\n${matchedOffers.offers.join("\n")}`,
    method: contracts.diamond.matchDeal,
    args: [dealAddress, matchedOffers.offers, matchedOffers.computeUnits],
  });

  const pats = getEventValues({
    contract: contracts.diamond,
    txReceipt: matchDealTxReceipt,
    eventName: "ComputeUnitsMatched",
    value: "unitId",
  });

  dbg(`got pats: ${stringifyUnknown(pats)}`);

  commandObj.logToStderr(
    `${color.yellow(pats.length)} workers joined the deal ${color.yellow(
      dealAddress,
    )}`,
  );
}

type MatchDealParm<T extends number> = Exclude<
  Parameters<MarketFacet["matchDeal"]>[T],
  Typed
>;

type GetMatchedOffersOut = {
  offers: MatchDealParm<1>;
  computeUnits: MatchDealParm<2>;
} | null;

async function getMatchedOffersByDealId(dealAddress: string) {
  const dealId = dealAddress.toLowerCase();
  const { deal, _meta, graphNetworks } = await getDealForMatching(dealId);

  if (deal === null || deal === undefined) {
    commandObj.error(`Deal not found. Searched for: ${dealId}`);
  }

  const [graphNetwork] = graphNetworks;

  if (graphNetwork === undefined) {
    throw new Error("graphNetworks array is empty");
  }

  if (
    graphNetwork.initTimestamp === null ||
    graphNetwork.initTimestamp === undefined
  ) {
    throw new Error(
      `graphNetwork.initTimestamp is not a number. Got: ${nullableToString(graphNetwork.initTimestamp)}`,
    );
  }

  if (
    graphNetwork.coreEpochDuration === null ||
    graphNetwork.coreEpochDuration === undefined
  ) {
    throw new Error(
      `graphNetwork.coreEpochDuration is not a number. Got: ${nullableToString(graphNetwork.coreEpochDuration)}`,
    );
  }

  if (
    graphNetwork.coreMinDealRematchingEpochs === null ||
    graphNetwork.coreMinDealRematchingEpochs === undefined
  ) {
    throw new Error(
      `graphNetwork.coreMinDealRematchingEpochs is not a number. Got: ${nullableToString(graphNetwork.coreMinDealRematchingEpochs)}`,
    );
  }

  if (_meta === null || _meta === undefined) {
    throw new Error(`_meta is expected to be ${nullableToString(_meta)}`);
  }

  if (_meta.block.timestamp === null || _meta.block.timestamp === undefined) {
    throw new Error(
      `_meta.block.timestamp is not a number. Got: ${nullableToString(_meta.block.timestamp)}`,
    );
  }

  const { initTimestamp, coreEpochDuration, coreMinDealRematchingEpochs } =
    graphNetwork;

  if (deal.effectors === null || deal.effectors === undefined) {
    throw new Error(
      `deal.effectors is ${nullableToString(deal.effectors)} for dealId: ${dealId}. Array is expected.`,
    );
  }

  const alreadyMatchedCU = deal.joinedWorkers?.length ?? 0;

  if (alreadyMatchedCU % deal.cuCountPerWorker !== 0) {
    throw new Error(
      `Unreachable. Deal already has matched compute units, but the number of compute units is not a multiple of cuCountPerWorker. Already matched CU: ${numToStr(alreadyMatchedCU)}, cuCountPerWorker: ${numToStr(deal.cuCountPerWorker)}`,
    );
  }

  const alreadyMatchedWorkers = alreadyMatchedCU / deal.cuCountPerWorker;
  const targetWorkersToMatch = deal.targetWorkers - alreadyMatchedWorkers;

  if (targetWorkersToMatch < 0) {
    throw new Error(
      `Deal already has more workers matched than target. In theory this should never be the case. Already matched: ${numToStr(alreadyMatchedWorkers)}, target: ${numToStr(deal.targetWorkers * deal.cuCountPerWorker)}`,
    );
  }

  if (targetWorkersToMatch === 0) {
    throw new Error(`Deal already has target number of workers matched.`);
  }

  const currentEpoch = calculateEpoch(
    _meta.block.timestamp,
    initTimestamp,
    coreEpochDuration,
  );

  const matchedAtEpoch =
    deal.matchedAt !== undefined
      ? calculateEpoch(Number(deal.matchedAt), initTimestamp, coreEpochDuration)
      : 0;

  const nextEpochToRematch = matchedAtEpoch + coreMinDealRematchingEpochs;

  if (currentEpoch <= nextEpochToRematch) {
    throw new Error(
      `Deal ${dealId} has been matched recently at: ${deal.matchedAt ?? "unknown"} (${numToStr(matchedAtEpoch)} epoch). Wait for ${numToStr(nextEpochToRematch)} epoch to rematch`,
    );
  }

  const minWorkersToMatch = Math.max(
    deal.minWorkers - alreadyMatchedWorkers,
    0,
  );

  const { whitelist: providersWhiteList, blacklist: providersBlackList } =
    prepareDealProviderAccessLists(
      deal.providersAccessType,
      deal.providersAccessList,
    );

  // Request page as big as allowed (remember about indexer limit).
  // Shortens the query response for that rule as additional query size optimization.
  const offersPerPageLimit = Math.min(targetWorkersToMatch, DEFAULT_PAGE_LIMIT);

  // Request page of peers and CUs as big as allowed (remember about indexer limit).
  const peersPerPageLimit = Math.min(
    deal.maxWorkersPerProvider,
    DEFAULT_PAGE_LIMIT,
  );

  const matchedOffers: NonNullable<GetMatchedOffersOut> = {
    offers: [],
    computeUnits: [],
  };

  let workersMatched = 0;

  // Go through indexer pages until the end condition: one of {fulfilled | end of offers, and peers, and CUs.}
  let lastPageReached = false;
  let offersOffset = 0;
  let peersOffset = 0;
  let computeUnitsOffset = 0;

  while (!lastPageReached) {
    const offers = await getMatchedOffersPage(
      {
        dealId,
        pricePerCuPerEpoch: deal.pricePerCuPerEpoch,
        cuCountPerWorker: deal.cuCountPerWorker,
        effectors: deal.effectors.map(({ effector: { id } }) => {
          return id;
        }),
        paymentToken: deal.paymentToken.id,
        targetWorkersToMatch,
        minWorkersToMatch,
        maxWorkersPerProvider: deal.maxWorkersPerProvider,
        currentEpoch,
        providersWhiteList,
        providersBlackList,
      },
      offersPerPageLimit,
      peersPerPageLimit,
      offersOffset,
      peersOffset,
      computeUnitsOffset,
    );

    if (offers.length === 0) {
      dbg("Got empty data from indexer, break search.");
      break;
    }

    // Analyze fetched data to understand if we need to fetch next page and what
    // params {offset, ...} to use for the next page.
    for (const { peers, id: offerId } of offers) {
      // Check if peers are empty and need to fetch next offer page.
      // It could happen because we have after fetch filter: not more than cuCountPerWorker per peer
      // that filters
      if (peers === null || peers === undefined || peers.length === 0) {
        offersOffset = offersOffset + DEFAULT_PAGE_LIMIT;
        peersOffset = 0;
        computeUnitsOffset = 0;
        break;
      }

      const peersToReturn: NonNullable<GetMatchedOffersOut>["computeUnits"][number] =
        [];

      for (const { computeUnits } of peers) {
        if (computeUnits === null || computeUnits === undefined) {
          continue;
        }

        if (computeUnits.length >= deal.cuCountPerWorker) {
          workersMatched = workersMatched + 1;

          peersToReturn.push(
            computeUnits.slice(0, deal.cuCountPerWorker).map((cu) => {
              return cu.id;
            }),
          );
        }

        if (workersMatched === targetWorkersToMatch) {
          matchedOffers.offers.push(offerId);
          matchedOffers.computeUnits.push(peersToReturn);
          return matchedOffers;
        }

        if (computeUnits.length < DEFAULT_PAGE_LIMIT) {
          if (peers.length < DEFAULT_PAGE_LIMIT) {
            if (offers.length < DEFAULT_PAGE_LIMIT) {
              lastPageReached = true;
            } else {
              offersOffset = offersOffset + DEFAULT_PAGE_LIMIT;
              peersOffset = 0;
              computeUnitsOffset = 0;
            }
          } else {
            peersOffset = peersOffset + DEFAULT_PAGE_LIMIT;
            computeUnitsOffset = 0;
          }
        } else {
          computeUnitsOffset = computeUnitsOffset + DEFAULT_PAGE_LIMIT;
        }
      }

      matchedOffers.offers.push(offerId);
      matchedOffers.computeUnits.push(peersToReturn);
    }
  }

  if (workersMatched < minWorkersToMatch) {
    dbg("workersMatched < minWorkersToMatch");
    matchedOffers.offers = [];
    matchedOffers.computeUnits = [];
  }

  if (
    matchedOffers.offers.length === 0 ||
    matchedOffers.computeUnits.length === 0
  ) {
    return null;
  }

  return matchedOffers;
}

function calculateEpoch(
  timestamp: number,
  epochControllerStorageInitTimestamp: number,
  epochControllerStorageEpochDuration: number,
) {
  dbg(
    `timestamp: ${numToStr(timestamp)} epochControllerStorageInitTimestamp: ${numToStr(epochControllerStorageInitTimestamp)} epochControllerStorageEpochDuration: ${numToStr(epochControllerStorageEpochDuration)}`,
  );

  return Math.floor(
    1 +
      (timestamp - epochControllerStorageInitTimestamp) /
        epochControllerStorageEpochDuration,
  );
}

function prepareDealProviderAccessLists(
  providersAccessType: number,
  providersAccessList:
    | {
        __typename?: "DealToProvidersAccess";
        provider: { __typename?: "Provider"; id: string };
      }[]
    | null
    | undefined,
): { whitelist: string[]; blacklist: string[] } {
  const res: { whitelist: string[]; blacklist: string[] } = {
    whitelist: [],
    blacklist: [],
  };

  if (
    providersAccessType === 0 ||
    providersAccessList === null ||
    providersAccessList === undefined
  ) {
    // None
    return res;
  }

  const providersAccessListStrings = providersAccessList.map((providerObj) => {
    return providerObj.provider.id;
  });

  if (providersAccessType === 1) {
    // whitelist
    res.whitelist = providersAccessListStrings;
  } else if (providersAccessType === 2) {
    // whitelist
    res.blacklist = providersAccessListStrings;
  }

  return res;
}

type GetMatchedOffersIn = {
  dealId: string;
  pricePerCuPerEpoch: string;
  cuCountPerWorker: number;
  effectors: string[];
  paymentToken: string;
  targetWorkersToMatch: number;
  minWorkersToMatch: number;
  maxWorkersPerProvider: number;
  currentEpoch: number;
  providersWhiteList: string[];
  providersBlackList: string[];
};

// must match market.matchDeal logic
async function getMatchedOffersPage(
  getMatchedOffersIn: GetMatchedOffersIn,
  offersPerPageLimit: number, // Possibility to optimize query size.
  peersPerPageLimit: number, // Possibility to control, e.g. maxWorkersPerProvider.
  offersOffset: number,
  peersOffset: number,
  computeUnitsOffset: number,
) {
  const currentEpochString = numToStr(getMatchedOffersIn.currentEpoch);

  const filters: NonNullable<OffersForMatchingQueryVariables["filters"]> = {
    // TODO: We do not need Offers with ALL peers already linked to the Deal (protocol restriction).
    pricePerEpoch_lte: getMatchedOffersIn.pricePerCuPerEpoch,
    paymentToken: getMatchedOffersIn.paymentToken.toLowerCase(),
    // Check if any of compute units are available in the offer and do not even fetch unrelated offers.
    computeUnitsAvailable_gt: 0,

    // Check if provider whitelisted/blacklisted below, and if CC Active below in case without whitelist below.
  };

  const peersFilter: NonNullable<
    NonNullable<OffersForMatchingQueryVariables["peersFilters"]>["and"]
  >[number] = {
    deleted: false,
    computeUnits_: { worker: null, deleted: false },
    // Check for CC Active status below and depends on provider whitelist filter.
  };

  // Some filters per peers, capacity commitments and compute units are copied
  // and implemented with different fields for the same filtration - it is so
  // because in subgraph it is impossible to filter on nested fields
  // and we do not want to reduce fetched data size (e.g. do to fetch offers
  // with no peers with our conditions)
  const indexerGetOffersParams: OffersForMatchingQueryVariables = {
    limit: offersPerPageLimit,
    filters,
    peersFilters: {
      and: [
        peersFilter,
        {
          // We do not need peers that already linked to the Deal (protocol restriction).
          or: [
            { joinedDeals_: { deal_not: getMatchedOffersIn.dealId } },
            { isAnyJoinedDeals: false },
          ],
        },
      ],
    },
    computeUnitsFilters: { worker: null, deleted: false },
    peersLimit: peersPerPageLimit,
    // We do not need more than cuCountPerWorker per peer. Apply restriction to already fetched and filtered data.
    computeUnitsLimit: getMatchedOffersIn.cuCountPerWorker,
    offset: offersOffset,
    peersOffset,
    computeUnitsOffset,
  };

  if (getMatchedOffersIn.effectors.length > 0) {
    filters.effectors_ = { effector_in: getMatchedOffersIn.effectors };
  }

  // Check for blacklisted Providers.
  if (getMatchedOffersIn.providersBlackList.length > 0) {
    filters.provider_ = { id_not_in: getMatchedOffersIn.providersBlackList };
  }

  // We require rather CU to be in Active CC (and not in blacklist if blacklist exists)
  // or CU from Deal whitelist of Providers.
  if (getMatchedOffersIn.providersWhiteList.length > 0) {
    filters.provider_ = { id_in: getMatchedOffersIn.providersWhiteList };
  } else {
    // No whitelist, thus, check for active cc status is required.
    // For Peers.
    filters.peers_ = {
      deleted: false,
      // Do not fetch peers with no any of compute units in "active" status at all.
      // Check if CU status is Active - if it has current capacity commitment and
      // cc.info.startEpoch <= currentEpoch_.
      currentCapacityCommitment_not: null,
      // Since it is not possible to filter by currentCapacityCommitment_.startEpoch_lt
      // we use this help field.
      currentCCCollateralDepositedAt_lte: currentEpochString,
      currentCCEndEpoch_gt: currentEpochString,
      currentCCNextCCFailedEpoch_gt: currentEpochString,
    };

    // For CUs.
    // Check if CU status is Active - if it has current capacity commitment and
    // cc.info.startEpoch <= currentEpoch_.
    peersFilter.currentCapacityCommitment_not = null;

    peersFilter.currentCapacityCommitment_ = {
      // Duplication as it is in DealExplorerClient: serializeCapacityCommitmentsFiltersToIndexer.
      startEpoch_lte: currentEpochString,
      endEpoch_gt: currentEpochString,
      // On each submitProof indexer should save nextCCFailedEpoch, and
      // in query we relay on that field to filter Failed CC.
      nextCCFailedEpoch_gt: currentEpochString,
      deleted: false,
      // Wait delegation is duplicating startEpoch_lte check, though.
      status_not_in: ["WaitDelegation", "Removed", "Failed"],
    };
  }

  dbg(
    `[getMatchedOffersPage] Requesting indexer for page with page params: ${JSON.stringify(
      indexerGetOffersParams,
      null,
      2,
    )}...`,
  );

  const fetched = await getOffersForMatching(indexerGetOffersParams);

  dbg(
    `[getMatchedOffersPage] Fetched data: ${JSON.stringify(fetched, null, 2)}`,
  );

  return fetched.offers;
}

export type DealNameAndId = {
  dealName: string;
  dealId: string;
};

export async function getDeals({
  args: { [DEPLOYMENT_NAMES_ARG_NAME]: deploymentNames },
  flags: { [DEAL_IDS_FLAG_NAME]: dealIds },
}: {
  args: {
    [DEPLOYMENT_NAMES_ARG_NAME]: string | undefined;
  };
  flags: {
    [DEAL_IDS_FLAG_NAME]: string | undefined;
  };
}): Promise<DealNameAndId[]> {
  if (dealIds !== undefined && deploymentNames !== undefined) {
    commandObj.error(
      `You can't use both ${color.yellow(
        DEPLOYMENT_NAMES_ARG_NAME,
      )} arg and ${color.yellow(
        `--${DEAL_IDS_FLAG_NAME}`,
      )} flag at the same time. Please pick one of them`,
    );
  }

  if (dealIds !== undefined) {
    return commaSepStrToArr(dealIds).map((dealId) => {
      return { dealName: dealId, dealId };
    });
  }

  const workersConfig = await initNewWorkersConfigReadonly();
  const fluenceEnv = await ensureFluenceEnv();

  if (deploymentNames !== undefined) {
    const names = commaSepStrToArr(deploymentNames);

    const [invalidNames, dealNamesAndIdsFromWorkerConfig] =
      splitErrorsAndResults(names, (dealName) => {
        const { dealIdOriginal: dealId } =
          workersConfig.deals?.[fluenceEnv]?.[dealName] ?? {};

        if (dealId === undefined) {
          return { error: dealName };
        }

        return { result: { dealName, dealId } };
      });

    if (invalidNames.length > 0) {
      commandObj.error(
        `Couldn't find deployments: ${color.yellow(
          invalidNames.join(", "),
        )} at ${workersConfig.$getPath()} in ${color.yellow(
          `deals.${fluenceEnv}`,
        )} property`,
      );
    }

    return dealNamesAndIdsFromWorkerConfig;
  }

  try {
    return await checkboxes<DealNameAndId, never>({
      message: `Select one or more deployments that you did on ${color.yellow(
        fluenceEnv,
      )} environment`,
      options: Object.entries(workersConfig.deals?.[fluenceEnv] ?? {}).map(
        ([dealName, { dealIdOriginal: dealId }]) => {
          return { name: dealName, value: { dealName, dealId } };
        },
      ),
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return "Please select at least one deployment";
        }

        return true;
      },
      oneChoiceMessage(choice) {
        return `There is currently only one deployment that you did on ${color.yellow(
          fluenceEnv,
        )} environment: ${color.yellow(choice)}. Do you want to select it`;
      },
      onNoChoices() {
        throw new Error(NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE);
      },
      flagName: DEAL_IDS_FLAG_NAME,
      argName: DEPLOYMENT_NAMES_ARG_NAME,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes(NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE)
    ) {
      throw error;
    }

    commandObj.warn(
      `No deployments found for ${color.yellow(
        fluenceEnv,
      )} environment at ${workersConfig.$getPath()}`,
    );

    return commaSepStrToArr(
      await input({
        message: "Enter comma-separated list of deal ids",
        validate: (val: string) => {
          return commaSepStrToArr(val).length === 0
            ? "Please enter at least one deal id"
            : true;
        },
      }),
    ).map((dealId) => {
      return { dealName: dealId, dealId };
    });
  }
}

const DEAL_ID_FLAG_NAME = "deal-id";
const DEAL_NAME_FLAG_NAME = "name";

export async function getDeal({
  flags: { [DEAL_ID_FLAG_NAME]: dealId, [DEAL_NAME_FLAG_NAME]: dealName },
}: {
  flags: {
    [DEAL_ID_FLAG_NAME]: string | undefined;
    [DEAL_NAME_FLAG_NAME]: string | undefined;
  };
}): Promise<DealNameAndId> {
  if (dealId !== undefined && dealName !== undefined) {
    commandObj.error(
      `You can't use both ${color.yellow(
        `--${DEAL_NAME_FLAG_NAME}`,
      )} flag and ${color.yellow(
        `--${DEAL_IDS_FLAG_NAME}`,
      )} flag at the same time. Please pick one of them`,
    );
  }

  if (dealId !== undefined) {
    return { dealName: dealId, dealId };
  }

  const workersConfig = await initNewWorkersConfigReadonly();
  const fluenceEnv = await ensureFluenceEnv();

  if (dealName !== undefined) {
    const { dealIdOriginal: dealId } =
      workersConfig.deals?.[fluenceEnv]?.[dealName] ?? {};

    if (dealId === undefined) {
      return commandObj.error(
        `Couldn't find deployment: ${color.yellow(
          dealName,
        )} at ${workersConfig.$getPath()} in ${color.yellow(
          `deals.${fluenceEnv}`,
        )} property`,
      );
    }

    return { dealName, dealId };
  }

  try {
    return await list<DealNameAndId, never>({
      message: `Select deployment that you did on ${color.yellow(
        fluenceEnv,
      )} environment`,
      options: Object.entries(workersConfig.deals?.[fluenceEnv] ?? {}).map(
        ([dealName, { dealIdOriginal: dealId }]) => {
          return { name: dealName, value: { dealName, dealId } };
        },
      ),
      oneChoiceMessage(choice) {
        return `There is currently only one deployment that you did on ${color.yellow(
          fluenceEnv,
        )} environment: ${color.yellow(choice)}. Do you want to select it`;
      },
      onNoChoices() {
        throw new Error(NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE);
      },
      flagName: DEAL_ID_FLAG_NAME,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      !error.message.includes(NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE)
    ) {
      throw error;
    }

    commandObj.warn(
      `No deployments found for ${color.yellow(
        fluenceEnv,
      )} environment at ${workersConfig.$getPath()}`,
    );

    const dealId = await input({ message: "Enter deal id" });
    return { dealName: dealId, dealId };
  }
}

const NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE =
  'No deployments found for "fluenceEnv"';
