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

import type { OfferDetail } from "@fluencelabs/deal-ts-clients/dist/dealCliClient/types/schemes.js";
import { color } from "@oclif/color";
import times from "lodash-es/times.js";
import { yamlDiffPatch } from "yaml-diff-patch";

import { jsonStringify } from "../../../common.js";
import { versions } from "../../../versions.js";
import { commandObj } from "../../commandObj.js";
import {
  ensureComputerPeerConfigs,
  ensureReadonlyProviderConfig,
} from "../../configs/project/provider.js";
import {
  initNewProviderArtifactsConfig,
  initReadonlyProviderArtifactsConfig,
} from "../../configs/project/providerArtifacts.js";
import {
  ALL_FLAG_VALUE,
  CLI_NAME,
  PT_SYMBOL,
  OFFER_FLAG_NAME,
  OFFER_IDS_FLAG_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
import { dbg } from "../../dbg.js";
import {
  getDealClient,
  getDealCliClient,
  getSignerAddress,
  sign,
  getEventValue,
  signBatch,
} from "../../dealClient.js";
import { startSpinner, stopSpinner } from "../../helpers/spinner.js";
import { numToStr } from "../../helpers/typesafeStringify.js";
import { uint8ArrayToHex } from "../../helpers/typesafeStringify.js";
import {
  commaSepStrToArr,
  setTryTimeout,
  splitErrorsAndResults,
  stringifyUnknown,
} from "../../helpers/utils.js";
import { checkboxes } from "../../prompt.js";
import { ensureFluenceEnv } from "../../resolveFluenceEnv.js";
import {
  cidHexStringToBase32,
  cidStringToCIDV1Struct,
  peerIdHexStringToBase58String,
  peerIdToUint8Array,
} from "../conversions.js";
import { ptFormatWithSymbol, ptParse } from "../currencies.js";
import { assertProviderIsRegistered } from "../providerInfo.js";

const MARKET_OFFER_REGISTERED_EVENT_NAME = "MarketOfferRegistered";
const OFFER_ID_PROPERTY = "offerId";

export type OffersArgs = {
  [OFFER_FLAG_NAME]?: string | undefined;
  force?: boolean | undefined;
};

export async function createOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  await assertProviderIsRegistered();
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();
  const usdc = dealClient.getUSDC();
  const providerArtifactsConfig = await initNewProviderArtifactsConfig();
  const fluenceEnv = await ensureFluenceEnv();

  const alreadyCreatedOffers = offers.filter(({ offerName }) => {
    const { id } =
      providerArtifactsConfig.offers[fluenceEnv]?.[offerName] ?? {};

    return id !== undefined;
  });

  if (alreadyCreatedOffers.length > 0 && flags.force !== true) {
    commandObj.error(
      `You already created the following offers: ${alreadyCreatedOffers
        .map(({ offerName }) => {
          return offerName;
        })
        .join(
          ", ",
        )}. You can update them if you want using '${CLI_NAME} provider offer-update' command`,
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
  //       minPricePerCuPerEpochBigInt,
  //     }) => {
  //       return [
  //         market.registerMarketOffer,
  //         minPricePerCuPerEpochBigInt,
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
      computePeersFromProviderConfig,
      effectorPrefixesAndHash,
      minPricePerCuPerEpochBigInt,
      offerName,
      minProtocolVersion,
      maxProtocolVersion,
    } = offer;

    const txReceipt = await sign(
      `Register offer: ${offerName}`,
      market.registerMarketOffer,
      minPricePerCuPerEpochBigInt,
      usdcAddress,
      effectorPrefixesAndHash,
      computePeersFromProviderConfig,
      minProtocolVersion ?? versions.protocolVersion,
      maxProtocolVersion ?? versions.protocolVersion,
    );

    registerMarketOfferTxReceipts.push({ offerName, txReceipt });
  }

  const notValidatedOfferIds = registerMarketOfferTxReceipts.map(
    ({ offerName, txReceipt }) => {
      return {
        offerName,
        offerId: getEventValue({
          contract: market,
          eventName: MARKET_OFFER_REGISTERED_EVENT_NAME,
          txReceipt,
          value: OFFER_ID_PROPERTY,
        }),
      };
    },
  );

  const [offerIdErrors, offerIds] = splitErrorsAndResults(
    notValidatedOfferIds,
    ({ offerId, offerName }) => {
      if (typeof offerId === "string") {
        return { result: { offerId, offerName } };
      }

      return {
        error: `for ${color.yellow(
          offerName,
        )} instead of offer id got: ${stringifyUnknown(offerId)}`,
      };
    },
  );

  if (offerIdErrors.length > 0) {
    commandObj.error(
      `When getting ${OFFER_ID_PROPERTY} property from event ${MARKET_OFFER_REGISTERED_EVENT_NAME}:\n\n${offerIdErrors.join(
        ", ",
      )}`,
    );
  }

  type GetOffersInfoReturnType = Awaited<
    ReturnType<typeof getOffersInfo<(typeof offerIds)[number]>>
  >;

  let offerInfoErrors: GetOffersInfoReturnType[0] = [];
  let offersInfo: GetOffersInfoReturnType[1] = [];

  const getOffersInfoRes = await setTryTimeout(
    "Getting offers info from indexer",
    async () => {
      [offerInfoErrors, offersInfo] = await getOffersInfo(offerIds);

      if (offerInfoErrors.length > 0) {
        throw new Error("Not all offers info received");
      }

      return { ok: true };
    },
    (error) => {
      return { error };
    },
    20_000,
    2_000,
  );

  if ("error" in getOffersInfoRes && offerInfoErrors.length === 0) {
    commandObj.warn(stringifyUnknown(getOffersInfoRes.error));
  }

  const providerAddress = await getSignerAddress();

  offerIds.forEach(({ offerName, offerId }) => {
    const offerPerEnv = providerArtifactsConfig.offers[fluenceEnv] ?? {};
    offerPerEnv[offerName] = { id: offerId, providerAddress };
    providerArtifactsConfig.offers[fluenceEnv] = offerPerEnv;
  });

  await providerArtifactsConfig.$commit();

  const offersStr = offerIds
    .map(({ offerName }) => {
      return offerName;
    })
    .join(", ");

  commandObj.logToStderr(`
Offers ${color.yellow(offersStr)} successfully created!

${await offersInfoToString([offerInfoErrors, offersInfo])}
`);
}

export async function offersInfoToString([
  offersInfoErrors,
  offersInfos,
]: Awaited<ReturnType<typeof getOffersInfo>>) {
  const offerInfoErrorsStr =
    offersInfoErrors.length > 0
      ? `${color.red(
          "Wasn't able to get the following offers from indexer:",
        )}\n${offersInfoErrors
          .map((offer) => {
            return `${offer.offerName === undefined ? "" : `${offer.offerName}: `}${offer.offerId}`;
          })
          .join("\n\n")}`
      : "";

  const offersInfoStr =
    offersInfos.length > 0
      ? `${color.green("Got offers info from indexer:")}\n\n${(
          await Promise.all(
            offersInfos.map(async (offerInfo) => {
              return `Offer: ${color.yellow(
                offerInfo.offerName ?? offerInfo.offerIndexerInfo.id,
              )}\n${await formatOfferInfo(offerInfo.offerIndexerInfo)}`;
            }),
          )
        ).join("\n\n")}`
      : "";

  return [offerInfoErrorsStr, offersInfoStr]
    .filter((info) => {
      return info !== "";
    })
    .join("\n\n");
}

async function formatOfferInfo(
  offerIndexerInfo: Awaited<
    ReturnType<typeof getOffersInfo>
  >[1][number]["offerIndexerInfo"],
) {
  return yamlDiffPatch(
    "",
    {},
    {
      "Provider ID": offerIndexerInfo.providerId,
      "Offer ID": offerIndexerInfo.id,
      "Created At": new Date(offerIndexerInfo.createdAt * 1000).toISOString(),
      "Last Updated At": new Date(
        offerIndexerInfo.updatedAt * 1000,
      ).toISOString(),
      "Price Per Epoch": `${offerIndexerInfo.pricePerEpoch} ${PT_SYMBOL}`,
      Effectors: await Promise.all(
        offerIndexerInfo.effectors.map(({ cid }) => {
          return cid;
        }),
      ),
      "Total compute units": offerIndexerInfo.totalComputeUnits,
      "Free compute units": offerIndexerInfo.freeComputeUnits,
      Peers: await Promise.all(
        offerIndexerInfo.peers.map(async ({ id, computeUnits }) => {
          return {
            "Peer ID": await peerIdHexStringToBase58String(id),
            "CU Count": computeUnits.length,
          };
        }),
      ),
    },
  );
}

export async function updateOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  await assertProviderIsRegistered();
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();
  const usdc = dealClient.getUSDC();
  const usdcAddress = await usdc.getAddress();

  const [notCreatedOffers, offersToUpdate] = splitErrorsAndResults(
    offers,
    (offer) => {
      const offerId = offer.offerId;

      if (offerId === undefined) {
        return { error: offer };
      }

      return { result: { ...offer, offerId } };
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
        )}. You can create them if you want using '${CLI_NAME} provider offer-create' command`,
    );
  }

  const [notFoundOffersInfo, offersInfo] = await getOffersInfo(offersToUpdate);

  if (notFoundOffersInfo.length > 0) {
    commandObj.warn(
      commandObj.warn(
        `Can't find the following offers:\n${notFoundOffersInfo
          .map((offer) => {
            return `${offer.offerName}: ${offer.offerId}`;
          })
          .join(
            "",
          )}\n\nPlease check whether the offer exists and try again. If the offer doesn't exist you can create it using '${CLI_NAME} provider offer-create' command`,
      ),
    );
  }

  for (const {
    minPricePerCuPerEpochBigInt,
    offerId,
    effectors,
    offerName,
    computePeersFromProviderConfig,
    offerIndexerInfo,
  } of offersInfo) {
    const populatedTxs = [];

    if (offerIndexerInfo.paymentToken.address !== usdcAddress.toLowerCase()) {
      populatedTxs.push({
        description: `\nchanging payment token from ${color.yellow(
          offerIndexerInfo.paymentToken.address,
        )} to ${color.yellow(usdcAddress)}`,
        tx: [market.changePaymentToken, offerId, usdcAddress],
      });
    }

    const minPricePerCuPerEpochBigIntFromIndexer = await ptParse(
      offerIndexerInfo.pricePerEpoch,
    );

    if (
      minPricePerCuPerEpochBigIntFromIndexer !== minPricePerCuPerEpochBigInt
    ) {
      populatedTxs.push({
        description: `\nchanging minPricePerCuPerEpochBigInt from ${color.yellow(
          await ptFormatWithSymbol(minPricePerCuPerEpochBigIntFromIndexer),
        )} to ${color.yellow(
          await ptFormatWithSymbol(minPricePerCuPerEpochBigInt),
        )}`,
        tx: [
          market.changeMinPricePerCuPerEpoch,
          offerId,
          minPricePerCuPerEpochBigInt,
        ],
      });
    }

    const offerClientInfoEffectors = await Promise.all(
      offerIndexerInfo.effectors.map(({ cid }) => {
        return cidHexStringToBase32(cid);
      }),
    );

    const removedEffectors = offerClientInfoEffectors.filter((cid) => {
      return effectors === undefined ? true : !effectors.includes(cid);
    });

    if (removedEffectors.length > 0) {
      populatedTxs.push({
        description: `\nRemoving effectors:\n${removedEffectors.join("\n")}`,
        tx: [
          market.removeEffector,
          offerId,
          await Promise.all(
            removedEffectors.map((cid) => {
              return cidStringToCIDV1Struct(cid);
            }),
          ),
        ],
      });
    }

    const addedEffectors = (effectors ?? []).filter((effector) => {
      return !offerClientInfoEffectors.some((cid) => {
        return cid === effector;
      });
    });

    if (addedEffectors.length > 0) {
      populatedTxs.push({
        description: `\nAdding effectors:\n${addedEffectors.join("\n")}`,
        tx: [
          market.addEffector,
          offerId,
          await Promise.all(
            addedEffectors.map((effector) => {
              return cidStringToCIDV1Struct(effector);
            }),
          ),
        ],
      });
    }

    const peersOnChain = await Promise.all(
      offerIndexerInfo.peers.map(async ({ id, ...rest }) => {
        return {
          peerIdBase58: await peerIdHexStringToBase58String(id),
          hexPeerId: id,
          ...rest,
        };
      }),
    );

    const computeUnitsToRemove = peersOnChain.flatMap(
      ({ peerIdBase58, computeUnits }) => {
        const alreadyRegisteredPeer = computePeersFromProviderConfig.find(
          (p) => {
            return p.peerIdBase58 === peerIdBase58;
          },
        );

        if (alreadyRegisteredPeer === undefined) {
          return [];
        }

        if (alreadyRegisteredPeer.unitIds.length < computeUnits.length) {
          return [
            {
              peerIdBase58,
              computeUnits: computeUnits
                .slice(
                  alreadyRegisteredPeer.unitIds.length - computeUnits.length,
                )
                .map(({ id }) => {
                  return id;
                }),
            },
          ];
        }

        return [];
      },
    );

    if (computeUnitsToRemove.length > 0) {
      populatedTxs.push(
        ...computeUnitsToRemove.flatMap(({ peerIdBase58, computeUnits }) => {
          return computeUnits.map((computeUnit, index) => {
            return {
              description:
                index === 0
                  ? `\nRemoving compute units from peer ${peerIdBase58}:\n${computeUnit}`
                  : computeUnit,
              tx: [market.removeComputeUnit, computeUnit],
            };
          });
        }),
      );
    }

    const computePeersToRemove = peersOnChain.filter(({ peerIdBase58 }) => {
      return !computePeersFromProviderConfig.some((p) => {
        return p.peerIdBase58 === peerIdBase58;
      });
    });

    if (computePeersToRemove.length > 0) {
      populatedTxs.push(
        ...computePeersToRemove.flatMap(
          ({ peerIdBase58, hexPeerId, computeUnits }) => {
            return [
              ...computeUnits.map((computeUnit, index) => {
                return {
                  description:
                    index === 0
                      ? `\nRemoving peer ${peerIdBase58} with compute units:\n${computeUnit.id}`
                      : computeUnit.id,
                  tx: [market.removeComputeUnit, computeUnit.id],
                };
              }),
              {
                description: "",
                tx: [market.removeComputePeer, hexPeerId],
              },
            ];
          },
        ),
      );
    }

    const computeUnitsToAdd = peersOnChain.flatMap(
      ({ peerIdBase58, hexPeerId, computeUnits }) => {
        const alreadyRegisteredPeer = computePeersFromProviderConfig.find(
          (p) => {
            return p.peerIdBase58 === peerIdBase58;
          },
        );

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

    if (computeUnitsToAdd.length > 0) {
      populatedTxs.push(
        ...computeUnitsToAdd.map(({ hexPeerId, unitIds, peerIdBase58 }) => {
          return {
            description: `\nAdding compute units to peer ${peerIdBase58}:\n${unitIds
              .map((unitId) => {
                return uint8ArrayToHex(Buffer.from(unitId));
              })
              .join("\n")}`,
            tx: [market.addComputeUnits, hexPeerId, unitIds],
          };
        }),
      );
    }

    const computePeersToAdd = computePeersFromProviderConfig.filter(
      ({ peerIdBase58 }) => {
        return !peersOnChain.some((p) => {
          return p.peerIdBase58 === peerIdBase58;
        });
      },
    );

    if (computePeersToAdd.length > 0) {
      populatedTxs.push({
        description: computePeersToAdd
          .map(({ peerIdBase58, unitIds }) => {
            return `\nAdding peer ${peerIdBase58} with compute units:\n${unitIds
              .map((unitId) => {
                return uint8ArrayToHex(Buffer.from(unitId));
              })
              .join("\n")}`;
          })
          .join("\n"),
        tx: [market.addComputePeers, offerId, computePeersToAdd],
      });
    }

    if (populatedTxs.length === 0) {
      commandObj.logToStderr(
        `\nNo changes found for offer ${color.yellow(
          offerName,
        )}. Skipping update`,
      );

      continue;
    }

    commandObj.logToStderr(
      `\nUpdating offer ${color.yellow(offerName)} with id ${color.yellow(
        offerId,
      )}:\n${populatedTxs
        .filter(({ description }) => {
          return description !== "";
        })
        .map(({ description }) => {
          return description;
        })
        .join("\n")}\n`,
    );

    await signBatch(
      "Update offer",
      // @ts-expect-error TODO: don't know at this moment how to fix this error. Will solve later
      populatedTxs.map(({ tx }) => {
        return tx;
      }),
    );
  }
}

export async function resolveOffersFromProviderConfig(
  flags: OffersArgs,
): Promise<EnsureOfferConfig[]> {
  const allOffers = await ensureOfferConfigs();

  if (flags[OFFER_FLAG_NAME] === ALL_FLAG_VALUE) {
    return allOffers;
  }

  const providerConfig = await ensureReadonlyProviderConfig();

  if (flags[OFFER_FLAG_NAME] === undefined) {
    return checkboxes<EnsureOfferConfig, never>({
      message: `Select one or more offer names from ${providerConfig.$getPath()}`,
      options: allOffers.map((offer) => {
        return {
          name: offer.offerName,
          value: offer,
        };
      }),
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return "Please select at least one offer name";
        }

        return true;
      },
      oneChoiceMessage(choice) {
        return `One offer found at ${providerConfig.$getPath()}: ${color.yellow(
          choice,
        )}. Do you want to select it`;
      },
      onNoChoices() {
        commandObj.error(
          `You must have at least one offer specified in ${providerConfig.$getPath()}`,
        );
      },
      flagName: OFFER_FLAG_NAME,
    });
  }

  const [notFoundOffers, offers] = splitErrorsAndResults(
    commaSepStrToArr(flags[OFFER_FLAG_NAME]),
    (offerName) => {
      const offer = allOffers.find((o) => {
        return o.offerName === offerName;
      });

      if (offer === undefined) {
        return { error: offerName };
      }

      return { result: offer };
    },
  );

  if (notFoundOffers.length > 0) {
    commandObj.error(
      `Offers: ${color.yellow(
        notFoundOffers.join(", "),
      )} are not found in the 'offers' section of ${providerConfig.$getPath()}`,
    );
  }

  return offers;
}

export type EnsureOfferConfig = Awaited<
  ReturnType<typeof ensureOfferConfigs>
>[number];

async function ensureOfferConfigs() {
  const providerConfig = await ensureReadonlyProviderConfig();
  const providerArtifactsConfig = await initReadonlyProviderArtifactsConfig();

  const { ethers } = await import("ethers");
  const fluenceEnv = await ensureFluenceEnv();

  return Promise.all(
    Object.entries(providerConfig.offers).map(
      async ([
        offerName,
        {
          minPricePerCuPerEpoch,
          effectors,
          computePeers,
          minProtocolVersion,
          maxProtocolVersion,
        },
      ]) => {
        const computePeerConfigs =
          await ensureComputerPeerConfigs(computePeers);

        const minPricePerCuPerEpochBigInt = await ptParse(
          minPricePerCuPerEpoch,
        );

        const computePeersFromProviderConfig = await Promise.all(
          computePeerConfigs.map(
            async ({ computeUnits, name, walletAddress, peerId }) => {
              return {
                name,
                peerIdBase58: peerId,
                peerId: await peerIdToUint8Array(peerId),
                unitIds: times(computeUnits).map(() => {
                  return ethers.randomBytes(32);
                }),
                owner: walletAddress,
              };
            },
          ),
        );

        const effectorPrefixesAndHash = await Promise.all(
          (effectors ?? []).map((effector) => {
            return cidStringToCIDV1Struct(effector);
          }),
        );

        const offerId =
          providerArtifactsConfig?.offers[fluenceEnv]?.[offerName]?.id;

        return {
          offerName,
          minPricePerCuPerEpochBigInt,
          effectorPrefixesAndHash,
          effectors,
          computePeersFromProviderConfig,
          offerId,
          minProtocolVersion,
          maxProtocolVersion,
        };
      },
    ),
  );
}

type OfferNameAndId = {
  offerName?: string;
  offerId: string;
};

type OfferArtifactsArgs = OffersArgs & {
  [OFFER_IDS_FLAG_NAME]: string | undefined;
};

export async function resolveCreatedOffers(flags: OfferArtifactsArgs) {
  if (
    flags[OFFER_FLAG_NAME] !== undefined &&
    flags[OFFER_IDS_FLAG_NAME] !== undefined
  ) {
    commandObj.error(
      `You can't use both ${color.yellow(
        `--${OFFER_FLAG_NAME}`,
      )} and ${color.yellow(
        `--${OFFER_IDS_FLAG_NAME}`,
      )} flags at the same time. Please pick one of them`,
    );
  }

  if (flags[OFFER_IDS_FLAG_NAME] !== undefined) {
    return commaSepStrToArr(flags[OFFER_IDS_FLAG_NAME]).map((offerId, i) => {
      return { offerName: `#${numToStr(i)}`, offerId };
    });
  }

  const providerArtifactsConfig = await initReadonlyProviderArtifactsConfig();

  if (providerArtifactsConfig === null) {
    return commandObj.error(
      `${PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME} is missing. Make sure you created offers using '${CLI_NAME} provider offer-create' command.`,
    );
  }

  const fluenceEnv = await ensureFluenceEnv();

  const allOffers = Object.entries(
    providerArtifactsConfig.offers[fluenceEnv] ?? {},
  ).map(([offerName, { id }]) => {
    return { offerName, offerId: id };
  });

  if (flags[OFFER_FLAG_NAME] === ALL_FLAG_VALUE) {
    return allOffers;
  }

  if (flags[OFFER_FLAG_NAME] === undefined) {
    return checkboxes<OfferNameAndId, never>({
      message: `Select one or more offer names from ${providerArtifactsConfig.$getPath()}`,
      options: allOffers.map((offer) => {
        return {
          name: offer.offerName,
          value: offer,
        };
      }),
      validate: (choices: string[]) => {
        if (choices.length === 0) {
          return "Please select at least one offer name";
        }

        return true;
      },
      oneChoiceMessage(choice) {
        return `One offer found at ${providerArtifactsConfig.$getPath()}: ${color.yellow(
          choice,
        )}. Do you want to select it`;
      },
      onNoChoices() {
        commandObj.error(
          `You must have at least one offer specified in ${providerArtifactsConfig.$getPath()}`,
        );
      },
      flagName: OFFER_FLAG_NAME,
    });
  }

  const [notFoundOffers, foundOffers] = splitErrorsAndResults(
    commaSepStrToArr(flags[OFFER_FLAG_NAME]),
    (offerName) => {
      const offer = allOffers.find((o) => {
        return o.offerName === offerName;
      });

      if (offer === undefined) {
        return { error: offerName };
      }

      return { result: offer };
    },
  );

  if (notFoundOffers.length > 0) {
    commandObj.error(
      `Offers: ${color.yellow(
        notFoundOffers.join(", "),
      )} are not found in 'offers' section of ${providerArtifactsConfig.$getPath()}`,
    );
  }

  return foundOffers;
}

export async function getOffersInfo<T extends OfferNameAndId>(
  offers: T[],
): Promise<[T[], (T & { offerIndexerInfo: OfferDetail })[]]> {
  const dealCliClient = await getDealCliClient();

  const getOffersArg: Parameters<typeof dealCliClient.getOffers>[0] = {
    ids: offers.map(({ offerId }) => {
      return offerId;
    }),
  };

  dbg(`Running dealCliClient.getOffers with ${jsonStringify(getOffersArg)}`);
  startSpinner("Fetching offers info from indexer");
  const offersIndexerInfo = await dealCliClient.getOffers(getOffersArg);
  stopSpinner();

  const offersInfoMap = Object.fromEntries(
    offersIndexerInfo.map((o) => {
      return [o.id, o] as const;
    }),
  );

  return splitErrorsAndResults(offers, (offer) => {
    const offerIndexerInfo = offersInfoMap[offer.offerId];

    if (offerIndexerInfo === undefined) {
      return {
        error: offer,
      };
    }

    return {
      result: {
        ...offer,
        offerIndexerInfo,
      },
    };
  });
}
