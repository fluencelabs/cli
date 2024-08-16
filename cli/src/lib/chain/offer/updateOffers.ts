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

import type { ComputeUnit } from "@fluencelabs/deal-ts-clients/dist/dealExplorerClient/types/schemes.js";
import { color } from "@oclif/color";

import { commandObj } from "../../commandObj.js";
import {
  CLI_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  PT_SYMBOL,
} from "../../const.js";
import { getDealClient, signBatch, populateTx } from "../../dealClient.js";
import { uint8ArrayToHex } from "../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../helpers/utils.js";
import { confirm } from "../../prompt.js";
import {
  cidStringToCIDV1Struct,
  peerIdHexStringToBase58String,
} from "../conversions.js";
import { ptFormat, ptFormatWithSymbol } from "../currencies.js";
import { assertProviderIsRegistered } from "../providerInfo.js";

import {
  type OffersArgs,
  resolveOffersFromProviderConfig,
  type EnsureOfferConfig,
  getOffersInfo,
} from "./offer.js";

type PeersOnChain = {
  computeUnits: ComputeUnit[];
  peerIdBase58: string;
  hexPeerId: string;
}[];

type Txs = { description?: string; tx: ReturnType<typeof populateTx> }[];

export async function updateOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  const offersFoundOnChain = await filterOffersFoundOnChain(offers);
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

  await signBatch(
    `Updating offers:\n\n${populatedTxs
      .map(({ offerName, offerId }) => {
        return `${offerName} (${offerId})`;
      })
      .join("\n")}`,
    updateOffersTxs,
  );
}

type OnChainOffer = Awaited<
  ReturnType<typeof filterOffersFoundOnChain>
>[number];

async function filterOffersFoundOnChain(offers: EnsureOfferConfig[]) {
  const [offersWithoutIds, offersWithIds] = splitErrorsAndResults(
    offers,
    (offer) => {
      return offer.offerId === undefined
        ? { error: offer }
        : { result: { ...offer, offerId: offer.offerId } };
    },
  );

  if (offersWithoutIds.length > 0) {
    commandObj.warn(
      `Some of the offers don't have ids stored in ${PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME} so this offers might not have been created on chain:\n${offersWithoutIds
        .map(({ offerName }) => {
          return offerName;
        })
        .join("\n")}`,
    );
  }

  const [offerInfoErrors, offersInfo] = await getOffersInfo(offersWithIds);

  if (offerInfoErrors.length > 0) {
    commandObj.warn(
      `Some of the offers are not found on chain:\n${offerInfoErrors
        .map(({ offerName, offerId }) => {
          return `${offerName} (${offerId})`;
        })
        .join(
          "\n",
        )}\n\nPlease make sure the offers exist. If the offers don't exist you can create them using '${CLI_NAME} provider offer-create' command`,
    );
  }

  return offersInfo;
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
          populateMinPricePerCuPerEpochTx(offer),
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

async function populatePaymentTokenTx({
  offerIndexerInfo,
  offerId,
}: OnChainOffer) {
  const { dealClient } = await getDealClient();
  const usdc = dealClient.getUSDC();
  const market = dealClient.getMarket();
  const usdcAddress = await usdc.getAddress();
  return offerIndexerInfo.paymentToken.address === usdcAddress
    ? []
    : [
        {
          description: `\nchanging payment token from ${color.yellow(
            offerIndexerInfo.paymentToken.address,
          )} to ${color.yellow(usdcAddress)}`,
          tx: populateTx(market.changePaymentToken, offerId, usdcAddress),
        },
      ];
}

async function populateMinPricePerCuPerEpochTx({
  offerIndexerInfo,
  minPricePerCuPerEpochBigInt,
  offerId,
}: OnChainOffer) {
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();
  return offerIndexerInfo.pricePerEpoch ===
    (await ptFormat(minPricePerCuPerEpochBigInt))
    ? []
    : [
        {
          description: `\nchanging minPricePerCuPerEpoch from ${color.yellow(
            `${offerIndexerInfo.pricePerEpoch} ${PT_SYMBOL}`,
          )} to ${color.yellow(
            await ptFormatWithSymbol(minPricePerCuPerEpochBigInt),
          )}`,
          tx: populateTx(
            market.changeMinPricePerCuPerEpoch,
            offerId,
            minPricePerCuPerEpochBigInt,
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
