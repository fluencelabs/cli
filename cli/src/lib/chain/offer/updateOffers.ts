/**
 * Copyright 2024 Fluence DAO
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

import type { ComputeUnit } from "@fluencelabs/deal-ts-clients/dist/dealExplorerClient/types/schemes.js";
import { color } from "@oclif/color";

import { commandObj } from "../../commandObj.js";
import { CLI_NAME } from "../../const.js";
import { getDealClient, signBatch, populateTx } from "../../dealClient.js";
import { uint8ArrayToHex } from "../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../helpers/utils.js";
import { confirm } from "../../prompt.js";
import {
  cidStringToCIDV1Struct,
  peerIdHexStringToBase58String,
} from "../conversions.js";
import { ptFormatWithSymbol } from "../currencies.js";
import { assertProviderIsRegistered } from "../providerInfo.js";

import {
  type OffersArgs,
  resolveOffersFromProviderConfig,
  type EnsureOfferConfig,
} from "./offer.js";

type PeersOnChain = {
  computeUnits: ComputeUnit[];
  peerIdBase58: string;
  hexPeerId: string;
}[];

type Txs = { description?: string; tx: ReturnType<typeof populateTx> }[];

export async function updateOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  const offersFoundOnChain = filterOffersFoundOnChain(offers);
  const populatedTxs = await populateUpdateOffersTxs(offersFoundOnChain);

  const updateOffersTxs = [
    populatedTxs.flatMap(({ removePeersFromOffersTxs }) => {
      return removePeersFromOffersTxs.map(({ tx }) => {
        return tx;
      });
    }),
    populatedTxs.flatMap(({ txs }) => {
      return txs.map(({ tx }) => {
        return tx;
      });
    }),
  ].flat();

  if (updateOffersTxs.length === 0) {
    commandObj.logToStderr("No changes found for selected offers");
    return;
  }

  printOffersToUpdateInfo(populatedTxs);

  if (
    !(await confirm({
      message: "Would you like to continue",
      default: true,
    }))
  ) {
    commandObj.logToStderr("Offers update canceled");
    return;
  }

  await assertProviderIsRegistered();
  await signBatch(updateOffersTxs);
}

type OnChainOffer = Awaited<
  ReturnType<typeof filterOffersFoundOnChain>
>[number];

function filterOffersFoundOnChain(offers: EnsureOfferConfig[]) {
  const [offersNotFoundOnChain, offersToUpdateFoundOnChain] =
    splitErrorsAndResults(
      offers,
      ({
        offerInfo: { offerInfo, offerIndexerInfo } = {
          offerInfo: undefined,
          offerIndexerInfo: undefined,
        },
        offerId,
        ...rest
      }) => {
        return offerId === undefined ||
          offerInfo === undefined ||
          offerIndexerInfo === undefined
          ? { error: { ...rest, offerId } }
          : { result: { ...rest, offerInfo, offerIndexerInfo, offerId } };
      },
    );

  if (offersNotFoundOnChain.length > 0) {
    commandObj.warn(
      `Some of the offers are not found on chain:\n${offersNotFoundOnChain
        .map(({ offerName, offerId }) => {
          return `${offerName}${offerId === undefined ? "" : ` (${offerId})`}`;
        })
        .join(
          "\n",
        )}\n\nPlease make sure the offers exist. If the offers don't exist you can create them using '${CLI_NAME} provider offer-create' command`,
    );
  }

  return offersToUpdateFoundOnChain;
}

function populateUpdateOffersTxs(offersFoundOnChain: OnChainOffer[]) {
  return Promise.all(
    offersFoundOnChain.map(async (offer) => {
      const { offerName, offerId, offerIndexerInfo } = offer;

      const peersOnChain = (await Promise.all(
        offerIndexerInfo.peers.map(async ({ id, ...rest }) => {
          return {
            peerIdBase58: await peerIdHexStringToBase58String(id),
            hexPeerId: id,
            ...rest,
          };
        }),
      )) satisfies PeersOnChain;

      const effectorsOnChain = await Promise.all(
        offerIndexerInfo.effectors.map(({ cid }) => {
          return cid;
        }),
      );

      const removePeersFromOffersTxs = (await populatePeersToRemoveTxs(
        offer,
        peersOnChain,
      )) satisfies Txs;

      const txs = (
        await Promise.all([
          populatePeersToAddTxs(offer, peersOnChain),

          populateEffectorsRemoveTx(offer, effectorsOnChain),
          populateEffectorsAddTx(offer, effectorsOnChain),

          populateCUToRemoveTxs(offer, peersOnChain),
          populateCUToAddTxs(offer, peersOnChain),

          populatePaymentTokenTx(offer),
          populateMinPricePerWorkerEpochTx(offer),
        ])
      ).flat() satisfies Txs;

      return { offerName, offerId, removePeersFromOffersTxs, txs };
    }),
  );
}

async function populatePeersToRemoveTxs(
  { computePeersFromProviderConfig }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

  const computePeersToRemove = peersOnChain.filter(({ peerIdBase58 }) => {
    return !computePeersFromProviderConfig.some((p) => {
      return p.peerIdBase58 === peerIdBase58;
    });
  });

  return computePeersToRemove.flatMap(
    ({ peerIdBase58, hexPeerId, computeUnits }) => {
      return [
        ...computeUnits.map((computeUnit, index) => {
          return {
            description:
              index === 0
                ? `\nRemoving peer ${peerIdBase58} with compute units:\n${computeUnit.id}`
                : computeUnit.id,
            tx: populateTx(market.removeComputeUnit, computeUnit.id),
          };
        }),
        { tx: populateTx(market.removeComputePeer, hexPeerId) },
      ];
    },
  );
}

async function populatePaymentTokenTx({ offerInfo, offerId }: OnChainOffer) {
  const { dealClient } = await getDealClient();
  const usdc = dealClient.getUSDC();
  const market = dealClient.getMarket();
  const usdcAddress = await usdc.getAddress();
  return offerInfo.paymentToken === usdcAddress
    ? []
    : [
        {
          description: `\nchanging payment token from ${color.yellow(
            offerInfo.paymentToken,
          )} to ${color.yellow(usdcAddress)}`,
          tx: populateTx(market.changePaymentToken, offerId, usdcAddress),
        },
      ];
}

async function populateMinPricePerWorkerEpochTx({
  offerInfo,
  minPricePerWorkerEpochBigInt,
  offerId,
}: OnChainOffer) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();
  return offerInfo.minPricePerWorkerEpoch === minPricePerWorkerEpochBigInt
    ? []
    : [
        {
          description: `\nchanging minPricePerWorker from ${color.yellow(
            await ptFormatWithSymbol(offerInfo.minPricePerWorkerEpoch),
          )} to ${color.yellow(
            await ptFormatWithSymbol(minPricePerWorkerEpochBigInt),
          )}`,
          tx: populateTx(
            market.changeMinPricePerWorkerEpoch,
            offerId,
            minPricePerWorkerEpochBigInt,
          ),
        },
      ];
}

async function populateEffectorsRemoveTx(
  { effectors, offerId }: OnChainOffer,
  effectorsOnChain: string[],
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

  const removedEffectors = effectorsOnChain.filter((cid) => {
    return effectors === undefined ? true : !effectors.includes(cid);
  });

  return removedEffectors.length === 0
    ? []
    : [
        {
          description: `\nRemoving effectors:\n${removedEffectors.join("\n")}`,
          tx: populateTx(
            market.removeEffector,
            offerId,
            await Promise.all(
              removedEffectors.map((cid) => {
                return cidStringToCIDV1Struct(cid);
              }),
            ),
          ),
        },
      ];
}

async function populateEffectorsAddTx(
  { effectors, offerId }: OnChainOffer,
  effectorsOnChain: string[],
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

  const addedEffectors = (effectors ?? []).filter((effector) => {
    return !effectorsOnChain.some((cid) => {
      return cid === effector;
    });
  });

  return addedEffectors.length === 0
    ? []
    : [
        {
          description: `\nAdding effectors:\n${addedEffectors.join("\n")}`,
          tx: populateTx(
            market.addEffector,
            offerId,
            await Promise.all(
              addedEffectors.map((effector) => {
                return cidStringToCIDV1Struct(effector);
              }),
            ),
          ),
        },
      ];
}

async function populateCUToRemoveTxs(
  { computePeersFromProviderConfig }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

  const computeUnitsToRemove = peersOnChain.flatMap(
    ({ peerIdBase58, computeUnits }) => {
      const alreadyRegisteredPeer = computePeersFromProviderConfig.find((p) => {
        return p.peerIdBase58 === peerIdBase58;
      });

      if (alreadyRegisteredPeer === undefined) {
        return [];
      }

      if (alreadyRegisteredPeer.unitIds.length < computeUnits.length) {
        return [
          {
            peerIdBase58,
            computeUnits: computeUnits
              .slice(alreadyRegisteredPeer.unitIds.length - computeUnits.length)
              .map(({ id }) => {
                return id;
              }),
          },
        ];
      }

      return [];
    },
  );

  return computeUnitsToRemove.flatMap(({ peerIdBase58, computeUnits }) => {
    return computeUnits.map((computeUnit, index) => {
      return {
        description:
          index === 0
            ? `\nRemoving compute units from peer ${peerIdBase58}:\n${computeUnit}`
            : computeUnit,
        tx: populateTx(market.removeComputeUnit, computeUnit),
      };
    });
  });
}

async function populateCUToAddTxs(
  { computePeersFromProviderConfig }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

  const computeUnitsToAdd = peersOnChain.flatMap(
    ({ peerIdBase58, hexPeerId, computeUnits }) => {
      const alreadyRegisteredPeer = computePeersFromProviderConfig.find((p) => {
        return p.peerIdBase58 === peerIdBase58;
      });

      if (
        alreadyRegisteredPeer === undefined ||
        alreadyRegisteredPeer.unitIds.length <= computeUnits.length
      ) {
        return [];
      }

      return [
        {
          hexPeerId,
          peerIdBase58: alreadyRegisteredPeer.peerIdBase58,
          unitIds: alreadyRegisteredPeer.unitIds.slice(
            computeUnits.length - alreadyRegisteredPeer.unitIds.length,
          ),
        },
      ];
    },
  );

  return computeUnitsToAdd.map(({ hexPeerId, unitIds, peerIdBase58 }) => {
    return {
      description: `\nAdding compute units to peer ${peerIdBase58}:\n${unitIds
        .map((unitId) => {
          return uint8ArrayToHex(Buffer.from(unitId));
        })
        .join("\n")}`,
      tx: populateTx(market.addComputeUnits, hexPeerId, unitIds),
    };
  });
}

async function populatePeersToAddTxs(
  { computePeersFromProviderConfig, offerId }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

  const computePeersToAdd = computePeersFromProviderConfig.filter(
    ({ peerIdBase58 }) => {
      return !peersOnChain.some((p) => {
        return p.peerIdBase58 === peerIdBase58;
      });
    },
  );

  return computePeersToAdd.length === 0
    ? []
    : [
        {
          description: computePeersToAdd
            .map(({ peerIdBase58, unitIds }) => {
              return `\nAdding peer ${peerIdBase58} with compute units:\n${unitIds
                .map((unitId) => {
                  return uint8ArrayToHex(Buffer.from(unitId));
                })
                .join("\n")}`;
            })
            .join("\n"),
          tx: populateTx(market.addComputePeers, offerId, computePeersToAdd),
        },
      ];
}

function printOffersToUpdateInfo(
  populatedTxs: Awaited<ReturnType<typeof populateUpdateOffersTxs>>,
) {
  commandObj.logToStderr(
    `Offers to update:\n\n${populatedTxs
      .flatMap(({ offerId, offerName, removePeersFromOffersTxs, txs }) => {
        const allTxs = [...removePeersFromOffersTxs, ...txs];

        if (allTxs.length === 0) {
          return [];
        }

        return [
          `Offer ${color.green(offerName)} with id ${color.yellow(
            offerId,
          )}:\n${allTxs
            .filter((tx): tx is typeof tx & { description: string } => {
              return "description" in tx;
            })
            .map(({ description }) => {
              return description;
            })
            .join("\n")}\n`,
        ];
      })
      .join("\n\n")}`,
  );
}
