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
import omit from "lodash-es/omit.js";

import { commandObj } from "../../commandObj.js";
import { initNewProviderArtifactsConfig } from "../../configs/project/providerArtifacts/providerArtifacts.js";
import {
  CLI_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
import { getContracts, signBatch, populateTx } from "../../dealClient.js";
import { numToStr } from "../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../helpers/utils.js";
import { confirm } from "../../prompt.js";
import { ensureFluenceEnv } from "../../resolveFluenceEnv.js";
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
  getOffersInfo,
  addRemainingCPs,
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

  await signBatch(
    `Updating offers:\n\n${populatedTxs
      .map(({ offerName, offerId }) => {
        return `${offerName} (${offerId})`;
      })
      .join("\n")}`,
    updateOffersTxs,
    assertProviderIsRegistered,
  );
}

export async function removeOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  const offersFoundOnChain = await filterOffersFoundOnChain(offers);
  const populatedTxs = await populateRemoveOffersTxs(offersFoundOnChain);

  const removeOffersTxs = [
    populatedTxs.flatMap(({ cuToRemoveTxs: txs }) => {
      return txs.map(({ tx }) => {
        return tx;
      });
    }),
    populatedTxs.flatMap(({ removePeersFromOffersTxs }) => {
      return removePeersFromOffersTxs.map(({ tx }) => {
        return tx;
      });
    }),
    populatedTxs.flatMap(({ removeOfferTx }) => {
      return [removeOfferTx.tx];
    }),
  ].flat();

  if (removeOffersTxs.length === 0) {
    commandObj.logToStderr("Nothing to remove for selected offers");
    return;
  }

  printOffersToRemoveInfo(populatedTxs);

  if (
    !(await confirm({
      message: "Would you like to continue",
      default: true,
    }))
  ) {
    commandObj.logToStderr("Offers remove canceled");
    return;
  }

  await signBatch(
    `Removing offers:\n\n${populatedTxs
      .map(({ offerName, offerId }) => {
        return `${offerName} (${offerId})`;
      })
      .join("\n")}`,
    removeOffersTxs,
    assertProviderIsRegistered,
  );

  const providerArtifactsConfig = await initNewProviderArtifactsConfig();

  const fluenceEnv = await ensureFluenceEnv();

  providerArtifactsConfig.offers[fluenceEnv] = omit(
    providerArtifactsConfig.offers[fluenceEnv],
    populatedTxs.map(({ offerName }) => {
      return offerName;
    }),
  );

  await providerArtifactsConfig.$commit();
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

      await addMissingComputePeers(offer, peersOnChain);

      const txs = (
        await Promise.all([
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

function populateRemoveOffersTxs(offersFoundOnChain: OnChainOffer[]) {
  return Promise.all(
    offersFoundOnChain.map(async (offer) => {
      const { offerName, offerId, offerIndexerInfo } = offer;
      offer.computePeersFromProviderConfig = [];

      const peersOnChain = (await Promise.all(
        offerIndexerInfo.peers.map(async ({ id, ...rest }) => {
          return {
            peerIdBase58: await peerIdHexStringToBase58String(id),
            hexPeerId: id,
            ...rest,
          };
        }),
      )) satisfies PeersOnChain;

      const removePeersFromOffersTxs = (await populatePeersToRemoveTxs(
        offer,
        peersOnChain,
      )) satisfies Txs;

      const cuToRemoveTxs = (
        await populateCUToRemoveTxs(offer, peersOnChain)
      ).flat() satisfies Txs;

      const removeOfferTx = await populateOfferRemoveTx(offer);

      return {
        offerName,
        offerId,
        removePeersFromOffersTxs,
        cuToRemoveTxs,
        removeOfferTx,
      };
    }),
  );
}

async function populatePeersToRemoveTxs(
  { computePeersFromProviderConfig }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { contracts } = await getContracts();

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
            ...(index === 0
              ? {
                  description: `\nRemoving peer ${peerIdBase58} with ${numToStr(computeUnits.length)} compute units`,
                }
              : {}),
            tx: populateTx(contracts.diamond.removeComputeUnit, computeUnit.id),
          };
        }),
        { tx: populateTx(contracts.diamond.removeComputePeer, hexPeerId) },
      ];
    },
  );
}

async function populatePaymentTokenTx({
  offerIndexerInfo,
  offerId,
}: OnChainOffer) {
  const { contracts } = await getContracts();
  const usdcAddress = contracts.deployment.usdc;
  return offerIndexerInfo.paymentToken.address === usdcAddress.toLowerCase()
    ? []
    : [
        {
          description: `\nchanging payment token from ${color.yellow(
            offerIndexerInfo.paymentToken.address,
          )} to ${color.yellow(usdcAddress)}`,
          tx: populateTx(
            contracts.diamond.changePaymentToken,
            offerId,
            usdcAddress,
          ),
        },
      ];
}

async function populateMinPricePerCuPerEpochTx({
  offerIndexerInfo,
  minPricePerCuPerEpochBigInt,
  offerId,
}: OnChainOffer) {
  const { contracts } = await getContracts();
  return offerIndexerInfo.pricePerEpoch === minPricePerCuPerEpochBigInt
    ? []
    : [
        {
          description: `\nchanging minPricePerCuPerEpoch from ${color.yellow(
            await ptFormatWithSymbol(offerIndexerInfo.pricePerEpoch),
          )} to ${color.yellow(
            await ptFormatWithSymbol(minPricePerCuPerEpochBigInt),
          )}`,
          tx: populateTx(
            contracts.diamond.changeMinPricePerCuPerEpoch,
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
  const { contracts } = await getContracts();

  const removedEffectors = effectorsOnChain.filter((cid) => {
    return effectors === undefined ? true : !effectors.includes(cid);
  });

  return removedEffectors.length === 0
    ? []
    : [
        {
          description: `\nRemoving effectors:\n${removedEffectors.join("\n")}`,
          tx: populateTx(
            contracts.diamond.removeEffector,
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
  const { contracts } = await getContracts();

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
            contracts.diamond.addEffector,
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
  const { contracts } = await getContracts();

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
        ...(index === 0
          ? {
              description: `\nRemoving ${numToStr(computeUnits.length)} compute units from peer ${peerIdBase58}`,
            }
          : {}),
        tx: populateTx(contracts.diamond.removeComputeUnit, computeUnit),
      };
    });
  });
}

async function populateOfferRemoveTx({ offerId }: OnChainOffer) {
  const { contracts } = await getContracts();
  return {
    description: `\nRemoving offer: ${offerId}`,
    tx: populateTx(contracts.diamond.removeOffer, offerId),
  };
}

async function populateCUToAddTxs(
  { computePeersFromProviderConfig }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { contracts } = await getContracts();

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

  return computeUnitsToAdd.flatMap(({ hexPeerId, unitIds, peerIdBase58 }) => {
    return unitIds.map((CUId, i) => {
      return {
        ...(i === 0
          ? {
              description: `\nAdding ${numToStr(unitIds.length)} compute units to peer ${peerIdBase58}`,
            }
          : {}),
        tx: populateTx(contracts.diamond.addComputeUnits, hexPeerId, [CUId]),
      };
    });
  });
}

async function addMissingComputePeers(
  { computePeersFromProviderConfig, offerId, offerName }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const allCPs = computePeersFromProviderConfig.filter(({ peerIdBase58 }) => {
    return !peersOnChain.some((p) => {
      return p.peerIdBase58 === peerIdBase58;
    });
  });

  return addRemainingCPs({ allCPs, offerId, offerName });
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

function printOffersToRemoveInfo(
  populatedTxs: Awaited<ReturnType<typeof populateRemoveOffersTxs>>,
) {
  commandObj.logToStderr(
    `Offers to remove:\n\n${populatedTxs
      .flatMap(
        ({
          offerId,
          offerName,
          removePeersFromOffersTxs,
          cuToRemoveTxs,
          removeOfferTx,
        }) => {
          const allTxs = [
            ...removePeersFromOffersTxs,
            ...cuToRemoveTxs,
            removeOfferTx,
          ];

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
        },
      )
      .join("\n\n")}`,
  );
}
