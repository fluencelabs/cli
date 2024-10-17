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
import { getContracts, sign, getSignerAddress } from "../dealClient.js";

import { cidStringToCIDV1Struct } from "./conversions.js";

const CURRENTLY_UNUSED_CID =
  "bafybeihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku";

export async function registerProvider() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const { contracts } = await getContracts();

  await sign({
    async validateAddress(address: string) {
      const providerInfo = await getProviderInfoByAddress(address);

      if (providerInfo.name !== null) {
        commandObj.error(
          `Provider is already registered for address ${address} with name: ${providerInfo.name}. If you want to update the provider info, use '${CLI_NAME} provider update' command`,
        );
      }
    },
    title: `Register provider with the name: ${providerConfig.providerName}`,
    method: contracts.diamond.setProviderInfo,
    args: [
      providerConfig.providerName,
      await cidStringToCIDV1Struct(CURRENTLY_UNUSED_CID),
    ],
  });

  const providerInfo = await getProviderInfo();

  if (providerInfo.name === null) {
    commandObj.error(
      "Provider registration failed: could not retrieve provider name from chain",
    );
  }

  const signerAddress = await getSignerAddress();

  commandObj.logToStderr(`
Provider successfully registered!

Provider name: ${providerInfo.name}

Provider address: ${signerAddress}
`);
}

export async function updateProvider() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const { contracts } = await getContracts();

  await sign({
    async validateAddress(address: string) {
      const providerInfo = await getProviderInfoByAddress(address);

      if (providerInfo.name === null) {
        commandObj.error(
          `Provider is not registered yet. Please use '${CLI_NAME} provider register' command to register a new provider first`,
        );
      }
    },
    title: `Update provider name to ${providerConfig.providerName}`,
    method: contracts.diamond.setProviderInfo,
    args: [
      providerConfig.providerName,
      await cidStringToCIDV1Struct(CURRENTLY_UNUSED_CID),
    ],
  });

  const providerInfo = await getProviderInfo();

  if (providerInfo.name === null) {
    commandObj.error(
      "Provider update failed: could not retrieve provider name from chain",
    );
  }

  const signerAddress = await getSignerAddress();

  commandObj.logToStderr(`
Provider successfully updated!

Provider name: ${providerInfo.name}

Provider address: ${signerAddress}
`);
}

export async function getProviderInfoByAddress(address: string) {
  const { contracts } = await getContracts();
  const { name } = await contracts.diamond.getProviderInfo(address);
  return { name: name === "" ? null : name, address };
}

export async function getProviderInfo(address?: string) {
  return getProviderInfoByAddress(address ?? (await getSignerAddress()));
}

export async function assertProviderIsRegistered(address: string) {
  const providerInfo = await getProviderInfoByAddress(address);

  if (providerInfo.name === null) {
    commandObj.error(
      `You have to register as a provider first. Use '${CLI_NAME} provider register' command for that`,
    );
  }
}
