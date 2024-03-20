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

import { color } from "@oclif/color";

import { commandObj } from "../commandObj.js";
import { type ChainENV } from "../const.js";
import { type DealNameAndId } from "../deal.js";
import { getReadonlyDealClient } from "../dealClient.js";
import { ensureChainEnv } from "../ensureChainNetwork.js";

import { peerIdHexStringToBase58String } from "./conversions.js";
import { ptFormatWithSymbol } from "./currencies.js";

const blockScoutUrls: Record<Exclude<ChainENV, "local">, string> = {
  kras: "https://blockscout.kras.fluence.dev/address/",
  dar: "https://blockscout-dar.fluence.dev/address/",
  stage: "https://blockscout-stage.fluence.dev/address/",
};

export async function printDealInfo({ dealId, dealName }: DealNameAndId) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const deal = readonlyDealClient.getDeal(dealId);
  commandObj.log(`\n${color.yellow(dealName)} info:`);
  const status = await deal.getStatus();
  const env = await ensureChainEnv();

  if (env !== "local") {
    commandObj.log(`Deal: ${blockScoutUrls[env]}${dealId}`);
  }

  commandObj.log(`DealID: "${dealId}"`);

  //TODO: change to enum
  switch (status) {
    case 0n:
      commandObj.log(`Status: Inactive`);
      break;
    case 1n:
      commandObj.log(`Status: Active`);
      break;
    case 2n:
      commandObj.log(`Status: Ended`);
      break;
  }

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
  commandObj.log(`Min workers: ${await deal.minWorkers()}`);
  commandObj.log(`Target workers: ${await deal.targetWorkers()}`);

  const currentComputeUnitCount = await deal["getComputeUnitCount()"]();

  commandObj.log(`Current compute units: ${currentComputeUnitCount}`);

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
