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
} from "../configs/project/provider.js";
import {
  initNewProviderArtifactsConfig,
  initReadonlyProviderArtifactsConfig,
} from "../configs/project/providerArtifacts.js";
import { CLI_NAME, CURRENCY_MULTIPLIER, OFFERS_FLAG_NAME } from "../const.js";
import {
  getDealClient,
  getDealExplorerClient,
  signBatch,
  type CallsToBatch,
  sign,
  getEventValue,
} from "../dealClient.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
  stringifyUnknown,
} from "../helpers/utils.js";

import { assertProviderIsRegistered } from "./isProviderRegistered.js";

const MARKET_OFFER_REGISTERED_EVENT_NAME = "MarketOfferRegistered";
const OFFER_ID_PROPERTY = "offerId";

export type OffersArgs = {
  [OFFERS_FLAG_NAME]: string | undefined;
};

export async function createOffers(flags: OffersArgs) {
  await assertProviderIsRegistered();
  const offers = await resolveOffersFromProviderConfig(flags);
  const { dealClient } = await getDealClient();
  const market = await dealClient.getMarket();
  const usdc = await dealClient.getUSDC();
  const providerArtifactsConfig = await initNewProviderArtifactsConfig();

  const alreadyCreatedOffers = offers.filter(({ offerName }) => {
    const { id } = providerArtifactsConfig.offers[offerName] ?? {};
    return id !== undefined;
  });

  if (alreadyCreatedOffers.length > 0) {
    commandObj.error(
      `You already created the following offers: ${alreadyCreatedOffers
        .map(({ offerName }) => {
          return offerName;
        })
        .join(
          ", ",
        )}. You can update them if you want using '${CLI_NAME} provider update-offer' command`,
    );
  }

  const usdcAddress = await usdc.getAddress();

  // Multicall here is not working for some reason:
  // Event 'MarketOfferRegistered' with hash '0x8090f06b11ff71e91580cf20918a29fefe5fcb76bc8819d550d1aef761382a99' not found in logs of the successful transaction. Try updating Fluence CLI to the latest version

  // const registerMarketOfferTxReceipts = await signBatch(
  //   offers.map(
  //     ({
  //       computePeersToRegister,
  //       effectorPrefixesAndHash,
  //       minPricePerWorkerEpochBigInt,
  //     }) => {
  //       return [
  //         market.registerMarketOffer,
  //         minPricePerWorkerEpochBigInt,
  //         usdcAddress,
  //         effectorPrefixesAndHash,
  //         computePeersToRegister,
  //       ];
  //     },
  //   ),
  // );

  // if (registerMarketOfferTxReceipts === undefined) {
  //   return commandObj.error("No offers to create");
  // }

  // const notValidatedOfferIds = getEventValueFromReceipts({
  //   contract: market,
  //   eventName: MARKET_OFFER_REGISTERED_EVENT_NAME,
  //   txReceipts: registerMarketOfferTxReceipts,
  //   value: OFFER_ID_PROPERTY,
  // });

  const registerMarketOfferTxReceipts = [];

  for (const offer of offers) {
    const {
      computePeersToRegister,
      effectorPrefixesAndHash,
      minPricePerWorkerEpochBigInt,
    } = offer;

    const txReceipt = await sign(
      market.registerMarketOffer,
      minPricePerWorkerEpochBigInt,
      usdcAddress,
      effectorPrefixesAndHash,
      computePeersToRegister,
    );

    registerMarketOfferTxReceipts.push(txReceipt);
  }

  const notValidatedOfferIds = registerMarketOfferTxReceipts.map(
    (txReceipt) => {
      return getEventValue({
        contract: market,
        eventName: MARKET_OFFER_REGISTERED_EVENT_NAME,
        txReceipt,
        value: OFFER_ID_PROPERTY,
      });
    },
  );

  const [invalidOfferIds, offerIds] = splitErrorsAndResults(
    notValidatedOfferIds,
    (id) => {
      if (typeof id === "string") {
        return { result: id };
      }

      return { error: stringifyUnknown(id) };
    },
  );

  if (invalidOfferIds.length > 0) {
    commandObj.error(
      `Got invalid offerIds when getting ${OFFER_ID_PROPERTY} property from event ${MARKET_OFFER_REGISTERED_EVENT_NAME}: ${invalidOfferIds.join(
        ", ",
      )}`,
    );
  }

  const offersInfoResult = await getOffersInfo(
    Object.fromEntries(
      offerIds.map((offferId, i) => {
        return [offers[i]?.offerName ?? `unknown-offer-${i}`, offferId];
      }),
    ),
  );

  offersInfoResult.offersInfo.forEach(({ offerName, offerId }) => {
    providerArtifactsConfig.offers[offerName] = {
      id: offerId,
    };
  });

  await providerArtifactsConfig.$commit();

  const offersStr = offersInfoResult.offersInfo
    .map(({ offerId }) => {
      return offerId;
    })
    .join(", ");

  commandObj.logToStderr(`
Offers ${offersStr} successfully created!

${offersInfoToString(offersInfoResult)}
`);
}

export function offersInfoToString({
  offersInfo,
  offersInfoErrors,
}: Awaited<ReturnType<typeof getOffersInfo>>) {
  const offerInfoErrorsStr =
    offersInfoErrors.length > 0
      ? `${color.red(
          "Got errors when getting offer info from chain",
        )}: ${offersInfoErrors.join("\n\n")}`
      : "";

  const offersInfoStr =
    offersInfo.length > 0
      ? `${color.green("Got offers info from chain:")}\n\n${offersInfo
          .map(
            ({
              offerName,
              offerInfo: { peerCount, minPricePerWorkerEpoch, provider },
            }) => {
              return `
Offer: ${offerName}
Provider: ${provider}
Peer number: ${peerCount}
Peers: TODO

minPricePerWorkerEpoch: ${minPricePerWorkerEpoch}

effectors: TODO
`;
            },
          )
          .join("\n\n")}`
      : "";

  return [offerInfoErrorsStr, offersInfoStr].join("\n\n");
}

export async function updateOffers(flags: OffersArgs) {
  await assertProviderIsRegistered();
  const offers = await resolveOffersFromProviderConfig(flags);
  const { dealClient } = await getDealClient();
  const market = await dealClient.getMarket();
  const providerArtifactsConfig = await initNewProviderArtifactsConfig();

  const [notCreatedOffers, offersToUpdate] = splitErrorsAndResults(
    offers,
    (offer) => {
      const { id } = providerArtifactsConfig.offers[offer.offerName] ?? {};

      if (id === undefined) {
        return { error: offer };
      }

      return { result: { ...offer, id } };
    },
  );

  if (notCreatedOffers.length > 0) {
    commandObj.error(
      `You can't update offers that are not created yet. Not created offers: ${notCreatedOffers
        .map(({ offerName }) => {
          return offerName;
        })
        .join(
          ", ",
        )}. You can create them if you want using '${CLI_NAME} provider create-offer' command`,
    );
  }

  for (const { minPricePerWorkerEpochBigInt, id } of offersToUpdate) {
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

async function resolveOffersFromProviderConfig(flags: OffersArgs) {
  const providerConfig = await ensureReadonlyProviderConfig();

  const [notFoundOffers, offers] = splitErrorsAndResults(
    flags.offers === undefined
      ? Object.keys(providerConfig.offers)
      : commaSepStrToArr(flags.offers),
    (offerName) => {
      const offer = providerConfig.offers[offerName];

      if (offer === undefined) {
        return { error: offerName };
      }

      return { result: { offerName, ...offer } };
    },
  );

  if (notFoundOffers.length > 0) {
    commandObj.error(
      `Offers not found in ${providerConfig.$getPath()} 'offer' property: ${notFoundOffers.join(
        ", ",
      )}`,
    );
  }

  const [{ digest, CID }, { base58btc }, { ethers }] = await Promise.all([
    import("multiformats"),
    // eslint-disable-next-line import/extensions
    import("multiformats/bases/base58"),
    import("ethers"),
  ]);

  return Promise.all(
    offers.map(
      async ({
        minPricePerWorkerEpoch,
        offerName,
        effectors,
        computePeers,
      }) => {
        const computePeerConfigs =
          await ensureComputerPeerConfigs(computePeers);

        const minPricePerWorkerEpochBigInt = BigInt(
          minPricePerWorkerEpoch * CURRENCY_MULTIPLIER,
        );

        const computePeersToRegister = computePeerConfigs.map(
          ({ computeUnits, walletAddress, peerId }) => {
            return {
              peerId: digest
                .decode(base58btc.decode("z" + peerId))
                .bytes.subarray(6),
              unitIds: times(computeUnits).map(() => {
                return ethers.randomBytes(32);
              }),
              owner: walletAddress,
            };
          },
        );

        const effectorPrefixesAndHash = (effectors ?? []).map((effector) => {
          const bytesCid = CID.parse(effector).bytes;

          return {
            prefixes: bytesCid.slice(0, 4),
            hash: bytesCid.slice(4),
          };
        });

        return {
          offerName,
          minPricePerWorkerEpochBigInt,
          effectorPrefixesAndHash,
          effectors,
          computePeersToRegister,
          computePeers,
        };
      },
    ),
  );
}

export async function resolveOffersFromProviderArtifactsConfig(
  flags: OffersArgs,
) {
  const providerArtifactsConfig = await initReadonlyProviderArtifactsConfig();

  if (providerArtifactsConfig === null) {
    return [];
  }

  const [notFoundOffers, offers] = splitErrorsAndResults(
    flags.offers === undefined
      ? Object.keys(providerArtifactsConfig.offers)
      : commaSepStrToArr(flags.offers),
    (offerName) => {
      const offer = providerArtifactsConfig.offers[offerName];

      if (offer === undefined) {
        return { error: offerName };
      }

      return { result: { offerName, ...offer } };
    },
  );

  if (notFoundOffers.length > 0) {
    commandObj.error(
      `Offers not found in ${providerArtifactsConfig.$getPath()} 'offer' property: ${notFoundOffers.join(
        ", ",
      )}`,
    );
  }

  return offers;
}

export async function getOffersInfo(offers: Record<string, string>) {
  const { dealClient } = await getDealClient();
  const market = await dealClient.getMarket();

  const offerEntries = Object.entries(offers);

  const getOfferResults = await Promise.allSettled(
    offerEntries.map(async ([offerName, offerId]) => {
      return { offerName, offerId, offerInfo: await market.getOffer(offerId) };
    }),
  );

  const [offersInfoErrors, offersInfo] = splitErrorsAndResults(
    getOfferResults,
    (getOfferResult, i) => {
      if (getOfferResult.status === "fulfilled") {
        return { result: getOfferResult.value };
      }

      const error = stringifyUnknown(getOfferResult.reason);

      const [
        offerName = `unknown-offer-${i}`,
        offerId = `unknown-offer-id-${i}`,
      ] = offerEntries[i] ?? [];

      return {
        error: error.includes("Offer doesn't exist")
          ? `Offer ${color.yellow(offerName)} with id ${color.yellow(
              offerId,
            )} doesn't exist`
          : `Error when getting info for offer ${color.yellow(
              offerName,
            )} with id ${color.yellow(offerId)}: ${error}`,
      };
    },
  );

  return { offersInfoErrors, offersInfo };
}
