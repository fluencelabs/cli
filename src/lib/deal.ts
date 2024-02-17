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
import { CURRENCY_MULTIPLIER } from "./const.js";
import { dbg } from "./dbg.js";
import {
  sign,
  getDealClient,
  getDealMatcherClient,
  getEventValue,
  getEventValues,
} from "./dealClient.js";
import { setTryTimeout, stringifyUnknown } from "./helpers/utils.js";

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
