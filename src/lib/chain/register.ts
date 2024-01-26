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
import { ensureReadonlyProviderConfig } from "../configs/project/provider.js";
import { getDealClient, sign } from "../dealClient.js";

export async function register(flags: {
  noxes?: number | undefined;
  env: string | undefined;
  "priv-key": string | undefined;
}) {
  const providerConfig = await ensureReadonlyProviderConfig(flags);

  const { dealClient } = await getDealClient();
  const market = await dealClient.getMarket();
  const { CID } = await import("ipfs-http-client");

  const id = CID.parse(
    "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
  ).bytes;

  await sign(market.setProviderInfo, providerConfig.providerName, {
    prefixes: id.slice(0, 4),
    hash: id.slice(4),
  });

  commandObj.logToStderr(color.green("Provider registered"));
}
