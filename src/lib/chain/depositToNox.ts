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

import { commandObj } from "../commandObj.js";
import { resolveComputePeersByNames } from "../configs/project/provider.js";
import { NOX_NAMES_FLAG_NAME } from "../const.js";
import { getDealClient } from "../dealClient.js";
import { input } from "../prompt.js";

export async function depositToNox(flags: {
  amount?: string | undefined;
  [NOX_NAMES_FLAG_NAME]?: string | undefined;
}) {
  const computePeers = await resolveComputePeersByNames(flags);
  const { signerOrWallet } = await getDealClient();
  const { parseEther } = await import("ethers");

  const amount =
    flags.amount ??
    (await input({
      message: "Enter the amount of tokens to deposit to noxes",
    }));

  for (const computePeer of computePeers) {
    const s = await signerOrWallet.sendTransaction({
      to: computePeer.walletAddress,
      value: parseEther(amount),
    });

    const tx = await s.wait();

    commandObj.logToStderr(
      `Successfully deposited ${flags.amount} to ${computePeer.name} with tx hash: ${tx?.hash}`,
    );
  }
}
