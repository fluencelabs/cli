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
import { getDealClient, sign } from "../dealClient.js";

import { peerIdHexStringToBase58String } from "./conversions.js";

export async function withdrawCollateral(commitmentIds: string[]) {
  const { dealClient } = await getDealClient();
  const capacity = await dealClient.getCapacity();
  const market = await dealClient.getMarket();

  for (const commitmentId of commitmentIds) {
    const commitment = await capacity.getCommitment(commitmentId);
    const unitIds = await market.getComputeUnitIds(commitment.peerId);
    await sign(capacity.removeCUFromCC, commitmentId, [...unitIds]);
    await sign(capacity.finishCommitment, commitmentId);

    commandObj.logToStderr(
      `Collateral for commitment ${color.yellow(
        commitmentId,
      )} withdrawn. Peer ID: ${color.yellow(
        await peerIdHexStringToBase58String(commitment.peerId),
      )}`,
    );
  }
}
