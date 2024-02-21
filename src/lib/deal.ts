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

import { commandObj } from "./commandObj.js";
import {
  initNewWorkersConfig,
  initNewWorkersConfigReadonly,
} from "./configs/project/workers.js";
import {
  CURRENCY_MULTIPLIER,
  DEAL_IDS_FLAG_NAME,
  DEPLOYMENT_NAMES_ARG_NAME,
} from "./const.js";
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
  removeProperties,
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
  pricePerWorkerEpoch: number;
  effectors: string[];
  initialBalance: number;
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

  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  const pricePerWorkerEpochBigInt = BigInt(
    pricePerWorkerEpoch * CURRENCY_MULTIPLIER,
  );

  const minDealDepositedEpochs = await core.minDealDepositedEpoches();

  const minInitialBalanceBigInt =
    BigInt(targetWorkers) * pricePerWorkerEpochBigInt * minDealDepositedEpochs;

  const initialBalanceBigInt = BigInt(initialBalance * CURRENCY_MULTIPLIER);

  if (initialBalanceBigInt < minInitialBalanceBigInt) {
    commandObj.error(
      `${
        workerName === undefined ? "" : `${color.yellow(workerName)} :`
      }initialBalance ${color.yellow(
        initialBalance,
      )} is less than minimum initialBalance = targetWorkers * pricePerWorkerEpoch * ${minDealDepositedEpochs} = ${color.yellow(
        Number(minInitialBalanceBigInt) / CURRENCY_MULTIPLIER,
      )}. Please, increase initialBalance or decrease targetWorkers or pricePerWorkerEpoch`,
    );
  }

  await sign(usdc.approve, await market.getAddress(), initialBalanceBigInt);

  const deployDealTxReceipt = await sign(
    market.deployDeal,
    {
      prefixes: bytesCid.slice(0, 4),
      hash: bytesCid.slice(4),
    },
    await usdc.getAddress(),
    minWorkers,
    targetWorkers,
    maxWorkersPerProvider,
    pricePerWorkerEpochBigInt,
    effectors.map((effectorHash) => {
      const id = CID.parse(effectorHash).bytes;
      return {
        prefixes: id.slice(0, 4),
        hash: id.slice(4),
      };
    }),
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

  const { CID } = await import("ipfs-http-client");
  const bytesCid = CID.parse(appCID).bytes;

  await sign(deal.setAppCID, {
    prefixes: bytesCid.slice(0, 4),
    hash: bytesCid.slice(4),
  });
}

export async function match(dealAddress: string) {
  const { dealClient } = await getDealClient();
  const dealMatcherClient = await getDealMatcherClient();

  dbg(`running getMatchedOffersByDealId with dealAddress: ${dealAddress}`);

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
  const dealNamesAndIds: DealNameAndId[] = [];

  if (dealIds !== undefined) {
    dealNamesAndIds.push(
      ...commaSepStrToArr(dealIds).map((dealId) => {
        return { dealName: dealId, dealId };
      }),
    );
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
        `Couldn't deployments: ${color.yellow(
          invalidNames.join(", "),
        )} at ${workersConfig.$getPath()} in ${color.yellow(
          `deals.${fluenceEnv}`,
        )} property`,
      );
    }

    dealNamesAndIds.push(...dealNamesAndIdsFromWorkerConfig);
  }

  if (dealNamesAndIds.length === 0) {
    try {
      dealNamesAndIds.push(
        ...(await checkboxes<DealNameAndId, never>({
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
        })),
      );
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

      dealNamesAndIds.push(
        ...commaSepStrToArr(
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
        }),
      );
    }
  }

  return dealNamesAndIds;
}

const NO_DEPLOYMENTS_FOUND_ERROR_MESSAGE =
  'No deployments found for "fluenceEnv"';

export async function removeDealFromWorkersConfig(dealName: string) {
  const fluenceEnv = await ensureFluenceEnv();

  const workersConfig = await initNewWorkersConfig();
  const deals = workersConfig.deals;
  const dealsPerEnv = deals?.[fluenceEnv];

  if (
    deals !== undefined &&
    dealsPerEnv !== undefined &&
    dealName in dealsPerEnv
  ) {
    deals[fluenceEnv] = removeProperties(dealsPerEnv, ([k]) => {
      return k === dealName;
    });

    await workersConfig.$commit();

    commandObj.logToStderr(
      `Removed deal ${color.yellow(dealName)} from ${workersConfig.$getPath()}`,
    );
  }
}
