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
import { ensureReadonlyProviderConfig } from "../configs/project/provider.js";
import { CLI_NAME } from "../const.js";
import { getDealClient, sign } from "../dealClient.js";

export async function registerProvider() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const { dealClient, signerOrWallet } = await getDealClient();
  const market = await dealClient.getMarket();

  const initialProviderInfo = await market.getProviderInfo(
    signerOrWallet.address,
  );

  if (initialProviderInfo.name.length > 0) {
    commandObj.error(
      `Provider is already registered with name: ${initialProviderInfo.name}. If you want to update the provider info, use '${CLI_NAME} provider update' command`,
    );
  }

  const { CID } = await import("ipfs-http-client");

  const cid = CID.parse(
    // this is currently unused, it's just a random but valid CID
    "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
  ).bytes;

  await sign(market.setProviderInfo, providerConfig.providerName, {
    prefixes: cid.slice(0, 4),
    hash: cid.slice(4),
  });

  const providerInfo = await market.getProviderInfo(signerOrWallet.address);

  if (providerInfo.name.length === 0) {
    commandObj.error(
      "Provider registration failed: could not retrieve provider name from chain",
    );
  }

  commandObj.logToStderr(`
Provider successfully registered!

Provider name: ${providerInfo.name}

Provider address: ${signerOrWallet.address}
`);
}

export async function updateProvider() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const { dealClient, signerOrWallet } = await getDealClient();
  const market = await dealClient.getMarket();

  const initialProviderInfo = await market.getProviderInfo(
    signerOrWallet.address,
  );

  if (initialProviderInfo.name.length === 0) {
    commandObj.error(
      `Provider is not registered yet. Please use '${CLI_NAME} provider register' command to register a new provider first`,
    );
  }

  const { CID } = await import("ipfs-http-client");

  const cid = CID.parse(
    // this is currently unused, it's just a random but valid CID
    "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku",
  ).bytes;

  await sign(market.setProviderInfo, providerConfig.providerName, {
    prefixes: cid.slice(0, 4),
    hash: cid.slice(4),
  });

  const providerInfo = await market.getProviderInfo(signerOrWallet.address);

  if (providerInfo.name.length === 0) {
    commandObj.error(
      "Provider update failed: could not retrieve provider name from chain",
    );
  }

  commandObj.logToStderr(`
Provider successfully updated!

Provider name: ${providerInfo.name}

Provider address: ${signerOrWallet.address}
`);
}
