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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import assert from "node:assert";

import { color } from "@oclif/color";

import { cidStringToCIDV1Struct } from "./chain/conversions.js";
import { ptFormatWithSymbol, ptParse } from "./chain/currencies.js";
import { commandObj } from "./commandObj.js";
import { initNewWorkersConfigReadonly } from "./configs/project/workers.js";
import { DEAL_IDS_FLAG_NAME, DEPLOYMENT_NAMES_ARG_NAME } from "./const.js";
import { dbg } from "./dbg.js";
import {
  sign,
  getDealClient,
  getDealMatcherClient,
  getEventValue,
  getEventValues,
} from "./dealClient.js";
import {
  commaSepStrToArr,
  setTryTimeout,
  splitErrorsAndResults,
  stringifyUnknown,
} from "./helpers/utils.js";
import { checkboxes, input } from "./prompt.js";
import { ensureFluenceEnv } from "./resolveFluenceEnv.js";

type DealCreateArg = {
  appCID: string;
  minWorkers: number;
  targetWorkers: number;
  maxWorkersPerProvider: number;
  pricePerWorkerEpoch: string;
  effectors: string[];
  initialBalance: string;
  workerName?: string;
};

export async function dealCreate({
  appCID,
  minWorkers,
  targetWorkers,
  maxWorkersPerProvider,
  pricePerWorkerEpoch,
  effectors,
  initialBalance,
  workerName,
}: DealCreateArg) {
  const { dealClient } = await getDealClient();
  const core = await dealClient.getCore();
  const market = await dealClient.getMarket();
  const usdc = await dealClient.getUSDC();

  const pricePerWorkerEpochBigInt = await ptParse(pricePerWorkerEpoch);
  const initialBalanceBigInt = await ptParse(initialBalance);
  const minDealDepositedEpochs = await core.minDealDepositedEpoches();

  const minInitialBalanceBigInt =
    BigInt(targetWorkers) * pricePerWorkerEpochBigInt * minDealDepositedEpochs;

  if (initialBalanceBigInt < minInitialBalanceBigInt) {
    commandObj.error(
      `${
        workerName === undefined ? "" : `${color.yellow(workerName)} :`
      }initialBalance ${color.yellow(
        initialBalance,
      )} is less than minimum initialBalance = targetWorkers * pricePerWorkerEpoch * ${minDealDepositedEpochs} = ${color.yellow(
        await ptFormatWithSymbol(minInitialBalanceBigInt),
      )}. Please, increase initialBalance or decrease targetWorkers or pricePerWorkerEpoch`,
    );
  }

  await sign(usdc.approve, await market.getAddress(), initialBalanceBigInt);

  const deployDealTxReceipt = await sign(
    market.deployDeal,
    await cidStringToCIDV1Struct(appCID),
    await usdc.getAddress(),
    minWorkers,
    targetWorkers,
    maxWorkersPerProvider,
    pricePerWorkerEpochBigInt,
    await Promise.all(
      effectors.map((cid) => {
        return cidStringToCIDV1Struct(cid);
      }),
    ),
    // TODO: provider access type
    // 0 - no access list
    // 1 - white list
    // 2 - black list
    0,
    // TODO: provider access list
    [],
  );

  const dealId = getEventValue({
    contract: market,
    txReceipt: deployDealTxReceipt,
    eventName: "DealCreated",
    value: "deal",
  });

  assert(typeof dealId === "string", "dealId is not a string");
  return dealId;
}

type DealUpdateArg = {
  dealAddress: string;
  appCID: string;
};

export async function dealUpdate({ dealAddress, appCID }: DealUpdateArg) {
  const { dealClient } = await getDealClient();
  const deal = dealClient.getDeal(dealAddress);
  await sign(deal.setAppCID, await cidStringToCIDV1Struct(appCID));
}

export async function match(dealAddress: string) {
  const { dealClient } = await getDealClient();
  const dealMatcherClient = await getDealMatcherClient();
  dbg(`running getMatchedOffersByDealId with dealAddress: ${dealAddress}`);
  const core = await dealClient.getCore();
  dbg(`Current epoch: ${await core.currentEpoch()}`);

  const matchedOffers = await setTryTimeout(
    "get matched offers by deal id",
    () => {
      return dealMatcherClient.getMatchedOffersByDealId(dealAddress);
    },
    (err) => {
      commandObj.error(stringifyUnknown(err));
    },
    1000 * 60 * 5, // 5 minutes
  );

  if (matchedOffers.offers.length === 0) {
    return commandObj.error(`No matched offers for deal ${dealAddress}`);
  }

  dbg(`got matchedOffers: ${stringifyUnknown(matchedOffers)}`);

  const market = await dealClient.getMarket();

  const matchDealTxReceipt = await sign(
    market.matchDeal,
    dealAddress,
    matchedOffers.offers,
    matchedOffers.computeUnitsPerOffers,
  );

  const pats = getEventValues({
    contract: market,
    txReceipt: matchDealTxReceipt,
    eventName: "ComputeUnitMatched",
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

const NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE =
  'No deployments found for "fluenceEnv"';
