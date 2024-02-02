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
import times from "lodash-es/times.js";

import { commandObj } from "../commandObj.js";
import {
  ensureReadonlyProviderConfig,
  ensureComputerPeerConfigs,
  promptForOffer,
} from "../configs/project/provider.js";
import { CURRENCY_MULTIPLIER } from "../const.js";
import { getDealClient, sign } from "../dealClient.js";

export async function createOffer(flags: {
  offer?: string | undefined;
  env: string | undefined;
  "priv-key": string | undefined;
}) {
  const providerConfig = await ensureReadonlyProviderConfig(flags);

  let offer =
    flags.offer === undefined ? undefined : providerConfig.offers[flags.offer];

  if (offer === undefined) {
    if (flags.offer !== undefined) {
      commandObj.warn(`Offer ${color.yellow(flags.offer)} not found`);
    }

    offer = await promptForOffer(providerConfig.offers);
  }

  const { dealClient } = await getDealClient();
  const market = await dealClient.getMarket();
  const usdc = await dealClient.getUSDC();

  const minPricePerWorkerEpochBigInt = BigInt(
    offer.minPricePerWorkerEpoch * CURRENCY_MULTIPLIER,
  );

  const [{ digest, CID }, { base58btc }, { ethers }] = await Promise.all([
    import("multiformats"),
    // eslint-disable-next-line import/extensions
    import("multiformats/bases/base58"),
    import("ethers"),
  ]);

  const computePeers = await ensureComputerPeerConfigs(flags);

  const computePeersToRegister = computePeers.map(
    ({ computeUnits, walletAddress, peerId }) => {
      return {
        peerId: digest.decode(base58btc.decode("z" + peerId)).bytes.subarray(6),
        unitIds: times(computeUnits).map(() => {
          return ethers.randomBytes(32);
        }),
        owner: walletAddress,
      };
    },
  );

  //TODO: if offer exists, update it
  await sign(
    market.registerMarketOffer,
    minPricePerWorkerEpochBigInt,
    await usdc.getAddress(),
    (offer.effectors ?? []).map((effector) => {
      const bytesCid = CID.parse(effector).bytes;

      return {
        prefixes: bytesCid.slice(0, 4),
        hash: bytesCid.slice(4),
      };
    }),
    computePeersToRegister,
  );

  commandObj.logToStderr(color.green(`Offer registered`));
}
