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
import { type DealNameAndId } from "../deal.js";
import { getDealClient } from "../dealClient.js";

import { peerIdHexStringToBase58String } from "./conversions.js";

export async function printDealInfo({ dealId, dealName }: DealNameAndId) {
  const { dealClient } = await getDealClient();
  const deal = dealClient.getDeal(dealId);
  commandObj.log(`\n${color.yellow(dealName)} info:`);
  const status = await deal.getStatus();
  commandObj.log(`Deal ID: ${dealId}`);

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

  commandObj.log(`Balance: ${ethers.formatEther(await deal.getFreeBalance())}`);

  commandObj.log(
    `Price per worker per epoch: ${ethers.formatEther(
      await deal.pricePerWorkerEpoch(),
    )}`,
  );

  commandObj.log(`Payment token: ${await deal.paymentToken()}`);
  commandObj.log(`Min workers: ${await deal.minWorkers()}`);
  commandObj.log(`Target worker: ${await deal.targetWorkers()}`);

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
