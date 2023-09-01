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

import type Create from "../../commands/deal/create.js";
import { commandObj } from "../../lib/commandObj.js";
import { dealCreate } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureChainNetwork } from "../../lib/provider.js";

export async function createImpl(
  this: Create,
  command: typeof Create,
): Promise<void> {
  const { flags, maybeFluenceConfig } = await initCli(
    this,
    await this.parse(command),
  );

  const dealAddress = await dealCreate({
    appCID: flags["app-cid"],
    minWorkers: flags["min-workers"],
    targetWorkers: flags["target-workers"],
    privKey: flags["priv-key"],
    chainNetwork: await ensureChainNetwork({
      maybeNetworkFromFlags: flags.network,
      maybeDealsConfigNetwork: maybeFluenceConfig?.chainNetwork,
    }),
  });

  commandObj.logToStderr(`Deal contract created: ${color.yellow(dealAddress)}`);
}
