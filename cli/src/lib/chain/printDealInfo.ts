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

import { color } from "@oclif/color";

import { BLOCK_SCOUT_URLS } from "../../common.js";
import { commandObj } from "../commandObj.js";
import { type DealNameAndId } from "../deal.js";
import { getReadonlyDealClient } from "../dealClient.js";
import { ensureChainEnv } from "../ensureChainNetwork.js";
import { bigintToStr } from "../helpers/typesafeStringify.js";

import { peerIdHexStringToBase58String } from "./conversions.js";
import { ptFormatWithSymbol } from "./currencies.js";

export async function printDealInfo({ dealId, dealName }: DealNameAndId) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const deal = readonlyDealClient.getDeal(dealId);
  commandObj.log(`\n${color.yellow(dealName)} info:`);
  const status = await deal.getStatus();
  const env = await ensureChainEnv();
  const { DealStatus } = await import("@fluencelabs/deal-ts-clients");

  if (env !== "local") {
    commandObj.log(`Deal: ${BLOCK_SCOUT_URLS[env]}address/${dealId}`);
  }

  commandObj.log(`DealID: "${dealId}"`);
  commandObj.log(`Status: ${DealStatus[Number(status)] ?? "Unknown"}`);
  const { ethers } = await import("ethers");

  commandObj.log(
    `Balance: ${await ptFormatWithSymbol(await deal.getFreeBalance())}`,
  );

  commandObj.log(
    `Price per worker per epoch: ${await ptFormatWithSymbol(
      await deal.pricePerWorkerEpoch(),
    )}`,
  );

  commandObj.log(`Payment token: ${await deal.paymentToken()}`);
  commandObj.log(`Min workers: ${bigintToStr(await deal.minWorkers())}`);
  commandObj.log(`Target workers: ${bigintToStr(await deal.targetWorkers())}`);

  const currentComputeUnitCount = await deal["getComputeUnitCount()"]();

  commandObj.log(
    `Current compute units: ${bigintToStr(currentComputeUnitCount)}`,
  );

  if (currentComputeUnitCount === 0n) {
    commandObj.log(`No compute units`);
  } else {
    const computeUnits = await deal.getComputeUnits();

    for (const unit of computeUnits) {
      commandObj.log(`\nCompute unit: ${unit.id}`);
      commandObj.log(`Provider: ${unit.provider}`);

      if (unit.workerId === ethers.ZeroHash) {
        commandObj.log(`Worker Id: None`);
      } else {
        commandObj.log(`Worker Id: ${unit.workerId}`);
      }

      commandObj.log(`Peer Id Hex: ${unit.peerId}`);

      commandObj.log(
        `Peer Id base58: ${await peerIdHexStringToBase58String(unit.peerId)}`,
      );
    }
  }
}
