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
  initNewReadonlyProviderConfig,
  promptForOffer,
} from "../configs/project/provider.js";
import { CURRENCY_MULTIPLIER } from "../const.js";
import { dbg } from "../dbg.js";
import { getDealClient, promptConfirmTx, waitTx } from "../dealClient.js";
import { jsonStringify } from "../helpers/utils.js";
import { getSecretKeyOrReturnExisting } from "../keyPairs.js";
import { getPeerIdFromSecretKey } from "../multiaddres.js";

export async function register(flags: {
  offer?: string | undefined;
  noxes?: number | undefined;
  env: string | undefined;
  "priv-key": string | undefined;
}) {
  const providerConfig = await initNewReadonlyProviderConfig(flags);

  let offer =
    flags.offer === undefined ? undefined : providerConfig.offers[flags.offer];

  if (offer === undefined) {
    if (flags.offer !== undefined) {
      commandObj.warn(`Offer ${color.yellow(flags.offer)} not found`);
    }

    offer = await promptForOffer(providerConfig.offers);
  }

  const { dealClient, signerOrWallet } = await getDealClient();
  const market = await dealClient.getMarket();
  const flt = await dealClient.getFLT();

  const minPricePerWorkerEpochBigInt = BigInt(
    offer.minPricePerWorkerEpoch * CURRENCY_MULTIPLIER,
  );

  dbg(`minPricePerWorkerEpoch: ${minPricePerWorkerEpochBigInt}`);

  const [{ digest, CID }, { base58btc }, { ethers }] = await Promise.all([
    import("multiformats"),
    // eslint-disable-next-line import/extensions
    import("multiformats/bases/base58"),
    import("ethers"),
  ]);

  const signerAddress = await signerOrWallet.getAddress();

  const computePeersToRegister = await Promise.all(
    Object.entries(providerConfig.computePeers).map(
      async ([name, computePeer]) => {
        const { secretKey } = await getSecretKeyOrReturnExisting(name);
        const peerId = await getPeerIdFromSecretKey(secretKey);

        return {
          peerId: digest
            .decode(base58btc.decode("z" + peerId))
            .bytes.subarray(6),
          unitIds: times(computePeer.computeUnits).map(() => {
            return ethers.randomBytes(32);
          }),
          owner: signerAddress, //TODO: get owner for peer,
        };
      },
    ),
  );

  const registerMarketOfferParams: Parameters<
    typeof market.registerMarketOffer
  > = [
    minPricePerWorkerEpochBigInt,
    await flt.getAddress(),
    (offer.effectors ?? []).map((effector) => {
      const bytesCid = CID.parse(effector).bytes;

      return {
        prefixes: bytesCid.slice(0, 4),
        hash: bytesCid.slice(4),
      };
    }),
    computePeersToRegister,
  ];

  dbg(
    `calling market.registerMarketOffer using: ${jsonStringify(
      registerMarketOfferParams,
    )}`,
  );

  //TODO: if offer exists, update it
  const registerOfferTx = await market.registerMarketOffer(
    ...registerMarketOfferParams,
  );

  promptConfirmTx(flags["priv-key"]);
  await waitTx(registerOfferTx);
  commandObj.log(color.green(`Offer registered`));
}
