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

import type Register from "../../commands/provider/register.js";
import { commandObj } from "../../lib/commandObj.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  ensureChainNetwork,
  getSigner,
  promptConfirmTx,
  waitTx,
} from "../../lib/provider.js";

export async function registerImpl(
  this: Register,
  command: typeof Register,
): Promise<void> {
  const { flags, maybeFluenceConfig } = await initCli(
    this,
    await this.parse(command),
  );

  const network = await ensureChainNetwork({
    maybeNetworkFromFlags: flags.network,
    maybeDealsConfigNetwork: maybeFluenceConfig?.chainNetwork,
  });

  const signer = await getSigner(network, flags["priv-key"]);
  const { DealClient } = await import("@fluencelabs/deal-aurora");
  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const dealClient = new DealClient(signer, network);
  const globalContracts = dealClient.getGlobalContracts();
  const matcher = await globalContracts.getMatcher();
  const factory = await globalContracts.getFactory();
  const flt = await globalContracts.getFLT();
  const collateral = await factory.REQUIRED_COLLATERAL();
  const pricePerEpoch = await factory.PRICE_PER_EPOCH();

  const tx = await matcher.registerComputeProvider(
    pricePerEpoch,
    collateral,
    await flt.getAddress(),
    [],
  );

  promptConfirmTx(flags["priv-key"]);
  // TODO: remove when @fluencelabs/deal-aurora is migrated to ESModules
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  await waitTx(tx);

  commandObj.log(color.green(`Successfully joined to matching contract`));
}
