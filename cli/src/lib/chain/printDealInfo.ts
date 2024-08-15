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

  commandObj.log(
    `Balance: ${await ptFormatWithSymbol(await deal.getFreeBalance())}`,
  );

  commandObj.log(
    `Price per compute unit per epoch: ${await ptFormatWithSymbol(
      await deal.pricePerCuPerEpoch(),
    )}`,
  );

  commandObj.log(`Payment token: ${await deal.paymentToken()}`);
  commandObj.log(`Min workers: ${bigintToStr(await deal.minWorkers())}`);
  commandObj.log(`Target workers: ${bigintToStr(await deal.targetWorkers())}`);

  const cuCountPerWorker = await deal.cuCountPerWorker();

  commandObj.log(
    `Compute unit count per worker: ${bigintToStr(cuCountPerWorker)}`,
  );

  const workers = await deal.getWorkers();

  if (workers.length === 0) {
    commandObj.log(`No workers`);
  } else {
    for (const worker of workers) {
      commandObj.log(`\nOff-chain id: ${worker.offchainId}`);
      commandObj.log(`On-chain id: ${worker.onchainId}`);

      commandObj.log(
        `Peer Id base58: ${await peerIdHexStringToBase58String(worker.peerId)}`,
      );

      commandObj.log(`Joined epoch: ${bigintToStr(worker.joinedEpoch)}`);
      commandObj.log(`Compute units: ${worker.computeUnitIds.join("\n")}`);
      commandObj.log(`Provider: ${worker.provider}`);
    }
  }
}
