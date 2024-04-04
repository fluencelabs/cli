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
import { yamlDiffPatch } from "yaml-diff-patch";

import { versions } from "../../versions.js";
import { commandObj } from "../commandObj.js";
import {
  ensureComputerPeerConfigs,
  ensureReadonlyProviderConfig,
} from "../configs/project/provider.js";
import {
  initNewProviderArtifactsConfig,
  initReadonlyProviderArtifactsConfig,
} from "../configs/project/providerArtifacts.js";
import {
  ALL_FLAG_VALUE,
  CLI_NAME,
  PT_SYMBOL,
  DOT_FLUENCE_DIR_NAME,
  OFFER_FLAG_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  OFFER_IDS_FLAG_NAME,
} from "../const.js";
import {
  getDealClient,
  getDealCliClient,
  sign,
  getEventValue,
  signBatch,
  getReadonlyDealClient,
} from "../dealClient.js";
import { bigintToStr, numToStr } from "../helpers/typesafeStringify.js";
import {
  commaSepStrToArr,
  splitErrorsAndResults,
  stringifyUnknown,
} from "../helpers/utils.js";
import { checkboxes } from "../prompt.js";
import { ensureFluenceEnv } from "../resolveFluenceEnv.js";

import {
  cidStringToCIDV1Struct,
  peerIdHexStringToBase58String,
  peerIdToUint8Array,
  cidHexStringToBase32,
} from "./conversions.js";
import { ptFormatWithSymbol, ptParse } from "./currencies.js";
import { assertProviderIsRegistered } from "./providerInfo.js";

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
      computePeersFromProviderConfig,
      effectorPrefixesAndHash,
      minPricePerWorkerEpochBigInt,
      offerName,
      minProtocolVersion,
      maxProtocolVersion,
    } = offer;

    const txReceipt = await sign(
      market.registerMarketOffer,
      minPricePerWorkerEpochBigInt,
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

  const [offerInfoErrors, offersInfo] = await getOffersInfo(offerIds);

  offersInfo.forEach(({ offerName, offerId }) => {
    const offerPerEnv = providerArtifactsConfig.offers[fluenceEnv] ?? {};
    offerPerEnv[offerName] = { id: offerId };
    providerArtifactsConfig.offers[fluenceEnv] = offerPerEnv;
  });

  await providerArtifactsConfig.$commit();

  const offersStr = offersInfo
    .map(({ offerName }) => {
      return offerName;
    })
    .join(", ");

  commandObj.logToStderr(`
${
  offersStr.length === 0
    ? "No offers where created!"
    : `Offers ${color.yellow(offersStr)} successfully created!`
}
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
          "Got errors when getting offer info from chain",
        )}: ${offersInfoErrors.join("\n\n")}`
      : "";

  const offersInfoStr =
    offersInfos.length > 0
      ? `${color.green("Got offers info from chain:")}\n\n${(
          await Promise.all(
            offersInfos.map(async (offerInfo) => {
              return `Offer: ${color.yellow(
                offerInfo.offerName,
              )}\n${yamlDiffPatch("", {}, await resolveOfferInfo(offerInfo))}`;
            }),
          )
        ).join("\n\n")}`
      : "";

  return [offerInfoErrorsStr, offersInfoStr].join("\n\n");
}

async function resolveOfferInfo({
  offerId,
  offerInfo,
  offerIndexerInfo,
}: Awaited<ReturnType<typeof getOfferInfo>>) {
  if (offerIndexerInfo !== undefined) {
    return {
      "Provider ID": offerIndexerInfo.providerId,
      "Offer ID": offerIndexerInfo.id,
      "Created At": new Date(offerIndexerInfo.createdAt * 1000).toISOString(),
      "Last Updated At": new Date(
        offerIndexerInfo.updatedAt * 1000,
      ).toISOString(),
      "Price Per Epoch":
        offerInfo === undefined
          ? `${offerIndexerInfo.pricePerEpoch} ${PT_SYMBOL}`
          : await ptFormatWithSymbol(offerInfo.minPricePerWorkerEpoch),
      Effectors: await Promise.all(
        offerIndexerInfo.effectors.map(({ cid }) => {
          return cidHexStringToBase32(cid);
        }),
      ),
      "Total compute units": offerIndexerInfo.totalComputeUnits,
      "Free compute units": offerIndexerInfo.freeComputeUnits,
      Peers: await Promise.all(
        offerIndexerInfo.peers.map(async ({ id, computeUnits }) => {
          return {
            "Hex ID": id,
            "Peer ID": await peerIdHexStringToBase58String(id),
            "CU Count": computeUnits.length,
          };
        }),
      ),
    };
  }

  if (offerInfo !== undefined) {
    return {
      "Provider ID": offerInfo.provider,
      "Offer ID": offerId,
      "Price Per Epoch": await ptFormatWithSymbol(
        offerInfo.minPricePerWorkerEpoch,
      ),
      "Peer Count": bigintToStr(offerInfo.peerCount),
    };
  }

  return { offerId };
}

const COMMON_WARN_MSG = `. Please check whether the offer exists and try again. If the offer doesn't exist you can create it using '${CLI_NAME} provider offer-create' command`;

export async function updateOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  await assertProviderIsRegistered();
  const { dealClient } = await getDealClient();
  const market = dealClient.getMarket();

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

  for (const {
    minPricePerWorkerEpochBigInt,
    offerId,
    effectors,
    offerName,
    computePeersFromProviderConfig,
    offerInfo: { offerInfo, offerIndexerInfo } = {
      offerInfo: undefined,
      offerIndexerInfo: undefined,
    },
  } of offersToUpdate) {
    if (offerInfo === undefined) {
      commandObj.warn(
        `Can't find offer ${color.yellow(
          offerName,
        )} info on chain${COMMON_WARN_MSG}`,
      );

      continue;
    }

    if (offerIndexerInfo === undefined) {
      commandObj.warn(
        `Can't find offer ${color.yellow(
          offerName,
        )} info using the indexer${COMMON_WARN_MSG}`,
      );

      continue;
    }

    const populatedTxs = [];

    if (offerInfo.minPricePerWorkerEpoch !== minPricePerWorkerEpochBigInt) {
      populatedTxs.push({
        description: `changing minPricePerWorker from ${color.yellow(
          await ptFormatWithSymbol(offerInfo.minPricePerWorkerEpoch),
        )} to ${color.yellow(
          await ptFormatWithSymbol(minPricePerWorkerEpochBigInt),
        )}`,
        tx: [
          market.changeMinPricePerWorkerEpoch,
          offerId,
          minPricePerWorkerEpochBigInt,
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
        description: `Removing effectors: ${removedEffectors.join(", ")}`,
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
        description: `Adding effectors: ${addedEffectors.join(", ")}`,
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
          return computeUnits.map(({ id }) => {
            return id;
          });
        }

        if (alreadyRegisteredPeer.unitIds.length < computeUnits.length) {
          return computeUnits
            .slice(alreadyRegisteredPeer.unitIds.length - computeUnits.length)
            .map(({ id }) => {
              return id;
            });
        }

        return [];
      },
    );

    if (computeUnitsToRemove.length > 0) {
      populatedTxs.push(
        ...computeUnitsToRemove.map((computeUnit) => {
          return {
            description: `Removing compute unit: ${computeUnit}`,
            tx: [market.removeComputeUnit, computeUnit],
          };
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
        ...computePeersToRemove.map(({ peerIdBase58, hexPeerId }) => {
          return {
            description: `Removing peer: ${peerIdBase58}`,
            tx: [market.removeComputePeer, hexPeerId],
          };
        }),
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
            description: `Adding ${numToStr(
              unitIds.length,
            )} compute units to peer id ${peerIdBase58}`,
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
        description: `Adding peers:\n${computePeersToAdd
          .map(({ peerIdBase58, unitIds }) => {
            return `Peer: ${peerIdBase58} with ${numToStr(unitIds.length)} compute units`;
          })
          .join("\n")}`,
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
        .map(({ description }) => {
          return description;
        })
        .join("\n")}\n`,
    );

    await signBatch(
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

type EnsureOfferConfig = Awaited<ReturnType<typeof ensureOfferConfigs>>[number];

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
          minPricePerWorkerEpoch,
          effectors,
          computePeers,
          minProtocolVersion,
          maxProtocolVersion,
        },
      ]) => {
        const computePeerConfigs =
          await ensureComputerPeerConfigs(computePeers);

        const minPricePerWorkerEpochBigInt = await ptParse(
          minPricePerWorkerEpoch,
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

        const offerInfo =
          offerId === undefined
            ? undefined
            : await getOfferInfo({ offerId, offerName });

        return {
          offerName,
          minPricePerWorkerEpochBigInt,
          effectorPrefixesAndHash,
          effectors,
          computePeersFromProviderConfig,
          offerId,
          offerInfo,
          minProtocolVersion,
          maxProtocolVersion,
        };
      },
    ),
  );
}

type OfferFromProviderArtifacts = {
  offerName: string;
  offerId: string;
};

type OfferArtifactsArgs = OffersArgs & {
  [OFFER_IDS_FLAG_NAME]: string | undefined;
};

export async function resolveOffersFromProviderArtifactsConfig(
  flags: OfferArtifactsArgs,
): Promise<OfferFromProviderArtifacts[]> {
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
    commandObj.error(
      `Wasn't able to find ${PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME} in ${DOT_FLUENCE_DIR_NAME} which means you probably didn't create any offers yet. Please run '${CLI_NAME} provider offer-create' command first`,
    );
  }

  const fluenceEnv = await ensureFluenceEnv();

  const allOffers: OfferFromProviderArtifacts[] = Object.entries(
    providerArtifactsConfig.offers[fluenceEnv] ?? {},
  ).map(([offerName, { id }]) => {
    return { offerName, offerId: id };
  });

  if (flags[OFFER_FLAG_NAME] === ALL_FLAG_VALUE) {
    return allOffers;
  }

  if (flags[OFFER_FLAG_NAME] === undefined) {
    return checkboxes<OfferFromProviderArtifacts, never>({
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

export async function getOfferInfo(
  {
    offerId,
    offerName,
  }: {
    offerId: string;
    offerName: string;
  },
  isAllowedToFail = false,
) {
  const { readonlyDealClient } = await getReadonlyDealClient();
  const market = readonlyDealClient.getMarket();
  const dealCliClient = await getDealCliClient();

  let offerInfo = undefined;

  try {
    offerInfo = await market.getOffer(offerId);
  } catch (e) {
    if (isAllowedToFail) {
      throw e;
    }
  }

  let offerIndexerInfo = undefined;

  try {
    offerIndexerInfo = (await dealCliClient.getOffer(offerId)) ?? undefined;
  } catch {}

  return { offerName, offerId, offerInfo, offerIndexerInfo };
}

export async function getOffersInfo(offers: OfferFromProviderArtifacts[]) {
  const getOfferResults = await Promise.allSettled(
    offers.map((args) => {
      return getOfferInfo(args, true);
    }),
  );

  const [offersInfoErrors, offersInfo] = splitErrorsAndResults(
    getOfferResults,
    (getOfferResult, i) => {
      if (getOfferResult.status === "fulfilled") {
        return { result: getOfferResult.value };
      }

      const error = stringifyUnknown(getOfferResult.reason);
      const { offerId: offerId, offerName } = offers[i] ?? {};

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

  return [offersInfoErrors, offersInfo] as const;
}
