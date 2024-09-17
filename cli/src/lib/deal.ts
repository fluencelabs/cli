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

import { color } from "@oclif/color";

import { versions } from "../versions.js";

import {
  cidStringToCIDV1Struct,
  peerIdToUint8Array,
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
  sign,
  getDealClient,
  getDealMatcherClient,
  getEventValue,
  getEventValues,
  getReadonlyDealClient,
} from "./dealClient.js";
import { ensureChainEnv } from "./ensureChainNetwork.js";
import { bigintToStr } from "./helpers/typesafeStringify.js";
import {
  commaSepStrToArr,
  setTryTimeout,
  splitErrorsAndResults,
  stringifyUnknown,
} from "./helpers/utils.js";
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
  const { dealClient } = await getDealClient();
  const core = dealClient.getCore();
  const usdc = dealClient.getUSDC();

  const pricePerCuPerEpochBigInt = await ptParse(pricePerCuPerEpoch);
  const minDealDepositedEpochs = await core.minDealDepositedEpochs();
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

  const dealFactory = dealClient.getDealFactory();

  await sign({
    title: `Approve ${await ptFormatWithSymbol(initialBalanceBigInt)} to be deposited to the deal`,
    method: usdc.approve,
    args: [await dealFactory.getAddress(), initialBalanceBigInt],
  });

  const deployDealTxReceipt = await sign({
    title: `Create deal with appCID: ${appCID}`,
    method: dealFactory.deployDeal,
    args: [
      await cidStringToCIDV1Struct(appCID),
      await usdc.getAddress(),
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
    contract: dealFactory,
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
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();
  const { ZeroAddress } = await import("ethers");

  const offersWithCUs = await Promise.all(
    peerIds.map(async (peerId) => {
      const peerIdUint8Array = await peerIdToUint8Array(peerId);

      const computeUnits = (
        await Promise.all(
          [...(await market.getComputeUnitIds(peerIdUint8Array))].map(
            async (unitId) => {
              const info = await market.getComputeUnit(unitId);
              return { unitId, deal: info.deal };
            },
          ),
        )
      )
        .filter(({ deal }) => {
          return deal === ZeroAddress;
        })
        .map(({ unitId }) => {
          return unitId;
        });

      return {
        computeUnits,
        offerId: (await market.getComputePeer(peerIdUint8Array)).offerId,
        peerId,
      };
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
        method: market.matchDeal,
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
    const { readonlyDealClient } = await getReadonlyDealClient();
    const core = readonlyDealClient.getCore();

    const balance =
      (DEFAULT_DEAL_ACTIVE_DURATION_FOR_LOCAL_ENV /
        (await core.epochDuration())) *
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
  const { dealClient } = await getDealClient();
  const deal = dealClient.getDeal(dealAddress);

  await sign({
    title: `Update deal with new appCID: ${appCID}`,
    method: deal.setAppCID,
    args: [await cidStringToCIDV1Struct(appCID)],
  });
}

export async function match(dealAddress: string) {
  const { dealClient } = await getDealClient();
  const dealMatcherClient = await getDealMatcherClient();
  dbg(`running getMatchedOffersByDealId with dealAddress: ${dealAddress}`);
  const core = dealClient.getCore();

  dbg(
    `initTimestamp: ${bigintToStr(
      await core.initTimestamp(),
    )} Current epoch: ${bigintToStr(await core.currentEpoch())}`,
  );

  const matchedOffers = await setTryTimeout(
    "get matched offers by deal id",
    () => {
      return dealMatcherClient.getMatchedOffersByDealId(dealAddress);
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

  const market = dealClient.getMarket();

  const matchDealTxReceipt = await sign({
    title: `Match deal ${dealAddress} with offers:\n\n${matchedOffers.offers.join("\n")}`,
    method: market.matchDeal,
    args: [dealAddress, matchedOffers.offers, matchedOffers.computeUnits],
  });

  const pats = getEventValues({
    contract: market,
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
