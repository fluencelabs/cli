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

import { commandObj } from "../commandObj.js";
import { ensureReadonlyProviderConfig } from "../configs/project/provider.js";
import { CLI_NAME } from "../const.js";
import { getDealClient, sign, getSignerAddress } from "../dealClient.js";

import { cidStringToCIDV1Struct } from "./conversions.js";

const CURRENTLY_UNUSED_CID =
  "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";

export async function registerProvider() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const { dealClient } = await getDealClient();
  const signerAddress = await getSignerAddress();
  const market = dealClient.getMarket();
  const initialProviderInfo = await market.getProviderInfo(signerAddress);

  if (initialProviderInfo.name.length > 0) {
    commandObj.error(
      `Provider is already registered with name: ${initialProviderInfo.name}. If you want to update the provider info, use '${CLI_NAME} provider update' command`,
    );
  }

  await sign(
    `Register provider with the name: ${providerConfig.providerName}`,
    market.setProviderInfo,
    providerConfig.providerName,
    await cidStringToCIDV1Struct(CURRENTLY_UNUSED_CID),
  );

  const providerInfo = await market.getProviderInfo(signerAddress);

  if (providerInfo.name.length === 0) {
    commandObj.error(
      "Provider registration failed: could not retrieve provider name from chain",
    );
  }

  commandObj.logToStderr(`
Provider successfully registered!

Provider name: ${providerInfo.name}

Provider address: ${signerAddress}
`);
}

export async function updateProvider() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const { dealClient } = await getDealClient();
  const signerAddress = await getSignerAddress();
  const market = dealClient.getMarket();
  const initialProviderInfo = await market.getProviderInfo(signerAddress);

  if (initialProviderInfo.name.length === 0) {
    commandObj.error(
      `Provider is not registered yet. Please use '${CLI_NAME} provider register' command to register a new provider first`,
    );
  }

  await sign(
    `Update provider name to ${providerConfig.providerName}`,
    market.setProviderInfo,
    providerConfig.providerName,
    await cidStringToCIDV1Struct(CURRENTLY_UNUSED_CID),
  );

  const providerInfo = await market.getProviderInfo(signerAddress);

  if (providerInfo.name.length === 0) {
    commandObj.error(
      "Provider update failed: could not retrieve provider name from chain",
    );
  }

  commandObj.logToStderr(`
Provider successfully updated!

Provider name: ${providerInfo.name}

Provider address: ${signerAddress}
`);
}

export async function assertProviderIsRegistered() {
  const { dealClient } = await getDealClient();
  const signerAddress = await getSignerAddress();
  const market = dealClient.getMarket();

  const initialProviderInfo = await market.getProviderInfo(signerAddress);

  if (initialProviderInfo.name.length === 0) {
    commandObj.error(
      `You have to register as a provider first. Use '${CLI_NAME} provider register' command for that`,
    );
  }
}
