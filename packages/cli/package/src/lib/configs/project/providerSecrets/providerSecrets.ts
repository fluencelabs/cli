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

import { genSecretKeyOrReturnExisting } from "../../../keyPairs.js";
import {
  ensureProviderSecretsConfigPath,
  getFluenceDir,
} from "../../../paths.js";
import { getConfigInitFunction } from "../../initConfigNew.js";
import { type InitConfigOptions } from "../../initConfigNewTypes.js";
import type { ProviderConfig } from "../provider/provider.js";

import configOptions0, { type Config as Config0 } from "./providerSecrets0.js";

export const options: InitConfigOptions<Config0> = {
  description: "Defines secrets config used for provider set up",
  options: [configOptions0],
  getConfigPath: ensureProviderSecretsConfigPath,
  getSchemaDirPath: getFluenceDir,
};

export async function initNewProviderSecretsConfig(
  providerConfig: ProviderConfig,
) {
  return getConfigInitFunction(options, async () => {
    const { Wallet } = await import("ethers");

    return {
      noxes: Object.fromEntries(
        await Promise.all(
          Object.keys(providerConfig.computePeers).map(async (name) => {
            return [
              name,
              {
                networkKey: (await genSecretKeyOrReturnExisting(name))
                  .secretKey,
                signingWallet: Wallet.createRandom().privateKey,
              },
            ] as const;
          }),
        ),
      ),
    };
  })();
}
