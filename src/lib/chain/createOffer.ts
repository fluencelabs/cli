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

import assert from "assert";

import { color } from "@oclif/color";
import times from "lodash-es/times.js";

import { commandObj } from "../commandObj.js";
import {
  ensureReadonlyProviderConfig,
  ensureComputerPeerConfigs,
  promptForOfferName,
} from "../configs/project/provider.js";
import { initNewProviderArtifactsConfig } from "../configs/project/providerArtifacts.js";
import { CURRENCY_MULTIPLIER, PRIV_KEY_FLAG_NAME } from "../const.js";
import {
  getDealClient,
  getDealExplorerClient,
  getEventValue,
  sign,
  signBatch,
  type CallsToBatch,
} from "../dealClient.js";
import { stringifyUnknown } from "../helpers/utils.js";

export async function createOrUpdateOffer(flags: {
  offer?: string | undefined;
  env: string | undefined;
  [PRIV_KEY_FLAG_NAME]: string | undefined;
}) {
  const providerConfig = await ensureReadonlyProviderConfig(flags);

  let offerName =
    flags.offer ?? (await promptForOfferName(providerConfig.offers));

  let offer = providerConfig.offers[offerName];

  if (offer === undefined) {
    commandObj.warn(`Offer ${color.yellow(flags.offer)} not found`);
    offerName = await promptForOfferName(providerConfig.offers);
    offer = providerConfig.offers[offerName];

    assert(
      offer !== undefined,
      `Unreachable. Offer name was selected from the list`,
    );
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

  const providerArtifactsConfig = await initNewProviderArtifactsConfig();
  const { id } = providerArtifactsConfig.offers[offerName] ?? {};

  const effectors = (offer.effectors ?? []).map((effector) => {
    const bytesCid = CID.parse(effector).bytes;

    return {
      prefixes: bytesCid.slice(0, 4),
      hash: bytesCid.slice(4),
    };
  });

  if (id === undefined) {
    const registerMarketOfferTxReceipt = await sign(
      market.registerMarketOffer,
      minPricePerWorkerEpochBigInt,
      await usdc.getAddress(),
      effectors,
      computePeersToRegister,
    );

    const id = getEventValue({
      contract: market,
      eventName: "MarketOfferRegistered",
      txReceipt: registerMarketOfferTxReceipt,
      value: "offerId",
    });

    assert(
      typeof id === "string",
      `Offer created, but id is expected to be of type 'string', found: '${typeof id}'. ${stringifyUnknown(
        id,
      )}`,
    );

    providerArtifactsConfig.offers[offerName] = {
      id,
    };

    await providerArtifactsConfig.$commit();
    commandObj.logToStderr(color.green(`Offer ${id} registered`));
  } else {
    const offerInfo = await market.getOffer(id);
    const dealExplorerClient = await getDealExplorerClient();
    const offerExplorerInfo = await dealExplorerClient.getOffer(id);
    // TODO: USE IT
    void offerExplorerInfo;

    const populatedTxPromises: CallsToBatch<
      Parameters<typeof market.changeMinPricePerWorkerEpoch>
    > = [];

    if (offerInfo.minPricePerWorkerEpoch !== minPricePerWorkerEpochBigInt) {
      populatedTxPromises.push([
        market.changeMinPricePerWorkerEpoch,
        id,
        minPricePerWorkerEpochBigInt,
      ]);
    }

    await signBatch(populatedTxPromises);
  }
}
