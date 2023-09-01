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

import type Match from "../../commands/deal/match.js";
import { match } from "../../lib/deal.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";
import { ensureChainNetwork } from "../../lib/provider.js";

export async function matchImpl(
  this: Match,
  command: typeof Match,
): Promise<void> {
  const { flags, maybeFluenceConfig, args } = await initCli(
    this,
    await this.parse(command),
  );

  const dealAddress =
    args["DEAL-ADDRESS"] ?? (await input({ message: "Enter deal address" }));

  const network = await ensureChainNetwork({
    maybeNetworkFromFlags: flags.network,
    maybeDealsConfigNetwork: maybeFluenceConfig?.chainNetwork,
  });

  await match(network, flags["priv-key"], dealAddress);
}
