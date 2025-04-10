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

import assert from "node:assert";

import { color } from "@oclif/color";
import omit from "lodash-es/omit.js";

import { commandObj } from "../../commandObj.js";
import type { ResourceType } from "../../configs/project/provider/provider4.js";
import { initNewProviderArtifactsConfig } from "../../configs/project/providerArtifacts/providerArtifacts.js";
import {
  CLI_NAME,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  VCPU_PER_CU,
} from "../../const.js";
import { getContracts, signBatch, populateTx } from "../../dealClient.js";
import { numToStr } from "../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../helpers/utils.js";
import { deployManifests } from "../../manifestsDeploy.js";
import { confirm } from "../../prompt.js";
import { ensureFluenceEnv } from "../../resolveFluenceEnv.js";
import { uint8ArrayToPeerIdHexString } from "../conversions.js";
import {
  peerIdHexStringToBase58String,
  resourceSupplyFromChainToConfig,
} from "../conversions.js";
import { ptFormatWithSymbol } from "../currencies.js";
import { assertProviderIsRegistered } from "../providerInfo.js";

import {
  type OffersArgs,
  resolveOffersFromProviderConfig,
  type EnsureOfferConfig,
  getOffersInfo,
  type OnChainResource,
  addRemainingCPs,
} from "./offer.js";

type PeersOnChain = {
  computeUnits: {
    id: string;
    workerId: string | undefined;
  }[];
  resourcesByType: {
    cpu: OnChainResource;
    ram: OnChainResource;
    storage: [OnChainResource, ...OnChainResource[]];
    ip: OnChainResource;
    bandwidth: OnChainResource;
  };
  peerIdBase58: string;
  hexPeerId: string;
}[];

type Tx = {
  tx: ReturnType<typeof populateTx>;
  description?: string;
  peersToDeploy?: Array<string>;
};

type Txs = Tx[];
type TxsWithDescription = (Tx & { description: string })[];

export async function updateOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  const offersFoundOnChain = await filterOffersFoundOnChain(offers);
  const populatedOffersTxs = await populateUpdateOffersTxs(offersFoundOnChain);

  const [firstUpdateOffersTx, ...restUpdateOffersTxs] = [
    populatedOffersTxs.flatMap(({ removePeersFromOffersTxs }) => {
      return removePeersFromOffersTxs.map(({ tx }) => {
        return tx;
      });
    }),
    populatedOffersTxs.flatMap(({ txs }) => {
      return txs.map(({ tx }) => {
        return tx;
      });
    }),
  ].flat();

  const offersToAddCPsTo = populatedOffersTxs.filter(
    (
      offer,
    ): offer is (typeof populatedOffersTxs)[number] & {
      addMissingComputePeers: NonNullable<AddMissingComputePeers>;
    } => {
      return offer.addMissingComputePeers !== null;
    },
  );

  if (firstUpdateOffersTx === undefined && offersToAddCPsTo.length === 0) {
    commandObj.logToStderr("No changes found for selected offers");
    return;
  }

  printOffersToUpdateInfo(populatedOffersTxs);

  if (
    !(await confirm({
      message: "Would you like to continue",
      default: true,
    }))
  ) {
    commandObj.logToStderr("Offers update canceled");
    return;
  }

  if (firstUpdateOffersTx !== undefined) {
    await signBatch({
      title: `Updating offers:\n\n${populatedOffersTxs
        .map(({ offerName, offerId }) => {
          return `${offerName} (${offerId})`;
        })
        .join("\n")}`,
      populatedTxs: [firstUpdateOffersTx, ...restUpdateOffersTxs],
      validateAddress: assertProviderIsRegistered,
    });
  }

  for (const { addMissingComputePeers } of offersToAddCPsTo) {
    await addMissingComputePeers.execute();
  }

  const peersToDeploy = populatedOffersTxs.flatMap(({ txs }) => {
    return txs.flatMap(({ peersToDeploy }) => {
      return peersToDeploy ?? [];
    });
  });

  if (
    peersToDeploy.length > 0 &&
    (await confirm({
      message: `Changes that you made require the following peers k8s manifests to be generated and deployed:\n${peersToDeploy.join("\n")}\nDo you want to do that now?`,
      default: true,
    }))
  ) {
    await deployManifests({
      flags: { "peer-names": peersToDeploy.join(",") },
      writeManifestFiles: true,
    });
  }
}

export async function removeOffers(flags: OffersArgs) {
  const offers = await resolveOffersFromProviderConfig(flags);
  const offersFoundOnChain = await filterOffersFoundOnChain(offers);
  const populatedTxs = await populateRemoveOffersTxs(offersFoundOnChain);

  const [firstRemoveOffersTx, ...restRemoveOffersTxs] = [
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

  if (firstRemoveOffersTx === undefined) {
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

  await signBatch({
    title: `Removing offers:\n\n${populatedTxs
      .map(({ offerName, offerId }) => {
        return `${offerName} (${offerId})`;
      })
      .join("\n")}`,
    populatedTxs: [firstRemoveOffersTx, ...restRemoveOffersTxs],
    validateAddress: assertProviderIsRegistered,
  });

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
      `Some of the offers are not found on subgraph indexer:\n${offerInfoErrors
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

      const removePeersFromOffersTxs = (await populatePeersToRemoveTxs(
        offer,
        peersOnChain,
      )) satisfies Txs;

      const addMissingComputePeers = getAddMissingComputePeers(
        offer,
        peersOnChain,
      );

      const txs: Txs = (
        await Promise.all([
          populateDataCenterTx(offer),
          populateCUToRemoveTxs(offer, peersOnChain),
          populateChangeResourceSupplyAndDetailsTx(offer),
          populateCUToAddTxs(offer, peersOnChain),

          populatePaymentTokenTx(offer),

          populateChangeResourcePriceTx(offer),
          populatePeerResourcesTxs(offer),
        ])
      ).flat();

      return {
        offerName,
        offerId,
        removePeersFromOffersTxs,
        txs,
        addMissingComputePeers,
      };
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
    ({ peerIdBase58, hexPeerId, computeUnits, resourcesByType }) => {
      return [
        ...computeUnits.map((computeUnit, index) => {
          return {
            ...(index === 0
              ? {
                  description: `\nRemoving peer ${peerIdBase58} with ${numToStr(computeUnits.length)} compute units and resources`,
                }
              : {}),
            tx: populateTx(
              contracts.diamond.removeComputeUnitV2,
              computeUnit.id,
              resourcesByType.cpu.resourceId,
            ),
          };
        }),
        ...Object.values(resourcesByType)
          .flat()
          .map((resource) => {
            return {
              tx: populateTx(
                contracts.diamond.removePeerResource,
                hexPeerId,
                resource.resourceId,
              ),
            };
          }),
        { tx: populateTx(contracts.diamond.removeComputePeerV2, hexPeerId) },
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

async function populateDataCenterTx({
  offerIndexerInfo,
  offerId,
  dataCenter,
}: OnChainOffer) {
  const { contracts } = await getContracts();
  return offerIndexerInfo.dataCenter?.id === dataCenter.id
    ? []
    : [
        {
          description: `\nchanging data center from ${color.yellow(
            offerIndexerInfo.dataCenter?.id,
          )} to ${color.yellow(dataCenter.id)}`,
          tx: populateTx(
            contracts.diamond.setOfferDatacenter,
            offerId,
            dataCenter.id,
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
    ({ peerIdBase58, computeUnits, resourcesByType: resources }) => {
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
            resources,
          },
        ];
      }

      return [];
    },
  );

  return computeUnitsToRemove.flatMap(
    ({ peerIdBase58, computeUnits, resources }) => {
      return computeUnits.map((computeUnit, index) => {
        return {
          ...(index === 0
            ? {
                description: `\nRemoving ${numToStr(computeUnits.length)} compute units from peer ${peerIdBase58}`,
              }
            : {}),
          tx: populateTx(
            contracts.diamond.removeComputeUnitV2,
            computeUnit,
            resources.cpu.resourceId,
          ),
        };
      });
    },
  );
}

async function populateChangeResourcePriceTx({
  offerId,
  offerIndexerInfo,
  resourcePricesWithIds,
}: OnChainOffer) {
  const { contracts } = await getContracts();

  const resourcePricesWithIdsArr = Object.values(resourcePricesWithIds).flat();

  const allResourcePrices = Object.fromEntries(
    resourcePricesWithIdsArr.map(
      ({ price, resourceId, resourceName, resourceType }) => {
        return [resourceId, { price, resourceName, resourceType }];
      },
    ),
  );

  const prevResourcePriceChanges = await Promise.all(
    (offerIndexerInfo.offerResources ?? []).map(
      async ({ resourceDescription: { id }, resourcePrice }) => {
        const newResource = allResourcePrices[id];

        if (newResource === undefined) {
          return null;
        }

        const { price, resourceName, resourceType } = newResource;

        const newPrice =
          resourceType === "cpu" ? price / BigInt(VCPU_PER_CU) : price;

        if (newPrice === resourcePrice) {
          return null;
        }

        return {
          description: `Change ${resourceType} resource price for ${resourceName} from ${await ptFormatWithSymbol(resourceType === "cpu" ? resourcePrice * BigInt(VCPU_PER_CU) : resourcePrice)} to ${await ptFormatWithSymbol(price)}`,
          tx: populateTx(
            contracts.diamond.changeResourcePriceV2,
            offerId,
            id,
            newPrice,
          ),
        };
      },
    ),
  );

  const newResources = await Promise.all(
    resourcePricesWithIdsArr.map(
      async ({ price, resourceId, resourceName, resourceType }) => {
        const onChainResource = offerIndexerInfo.offerResources?.find((r) => {
          return r.resourceDescription.id === resourceId;
        });

        if (onChainResource !== undefined) {
          return null;
        }

        const newPrice =
          resourceType === "cpu" ? price / BigInt(VCPU_PER_CU) : price;

        return {
          description: `Adding ${resourceType} resource ${resourceName} to offer with price ${await ptFormatWithSymbol(price)}`,
          tx: populateTx(
            contracts.diamond.changeResourcePriceV2,
            offerId,
            resourceId,
            newPrice,
          ),
        };
      },
    ),
  );

  return prevResourcePriceChanges.concat(newResources).filter(Boolean);
}

type ResourceInfo = {
  supply: number;
  resourceId: string;
  details: string;
};

type ResourceSupplyUpdate = {
  resourceType: ResourceType;
  onChainResource: ResourceInfo;
  configuredResource: ResourceInfo;
};

async function createResourceSupplyAndDetailsUpdateTx(
  peerId: string,
  peerName: string,
  { resourceType, onChainResource, configuredResource }: ResourceSupplyUpdate,
) {
  const txs: TxsWithDescription = [];

  if (onChainResource.resourceId !== configuredResource.resourceId) {
    return txs;
  }

  if (onChainResource.details !== configuredResource.details) {
    const { contracts } = await getContracts();

    txs.push({
      description: `Changing ${resourceType} details from ${onChainResource.details} to ${configuredResource.details}`,
      tx: populateTx(
        contracts.diamond.changeResourceDetails,
        peerId,
        onChainResource.resourceId,
        configuredResource.details,
      ),
    });
  }

  if (
    resourceType === "cpu" || // no need for changeResourceMaxSupplyV2. addComputeUnitsV2 is enough
    onChainResource.supply === configuredResource.supply
  ) {
    return txs;
  }

  const { contracts } = await getContracts();

  const { supplyString } = await resourceSupplyFromChainToConfig(
    resourceType,
    configuredResource.supply,
  );

  const { supplyString: onChainSupplyString } =
    await resourceSupplyFromChainToConfig(resourceType, onChainResource.supply);

  txs.push({
    description: `Changing ${resourceType} supply from ${
      onChainSupplyString
    } to ${supplyString}`,
    tx: populateTx(
      contracts.diamond.changeResourceMaxSupplyV2,
      peerId,
      onChainResource.resourceId,
      configuredResource.supply,
    ),
    ...(resourceType === "ip" ? { peersToDeploy: [peerName] } : {}),
  });

  return txs;
}

async function populateChangeResourceSupplyAndDetailsTx({
  computePeersFromProviderConfig,
  offerIndexerInfo,
}: OnChainOffer) {
  const txs: Txs = [];

  for (const peer of offerIndexerInfo.peers) {
    const peerIdBase58 = await peerIdHexStringToBase58String(peer.id);

    const configuredPeer = computePeersFromProviderConfig.find((cp) => {
      return cp.peerIdBase58 === peerIdBase58;
    });

    if (configuredPeer === undefined) {
      continue;
    }

    const resourceSupplyAndDetailsUpdates: ResourceSupplyUpdate[] = [
      {
        resourceType: "ram",
        onChainResource: peer.resourcesByType.ram,
        configuredResource: configuredPeer.resourcesByType.ram,
      },
      {
        resourceType: "cpu",
        onChainResource: peer.resourcesByType.cpu,
        configuredResource: configuredPeer.resourcesByType.cpu,
      },
      ...configuredPeer.resourcesByType.storage
        .map((configuredStorage) => {
          const onChainStorage = peer.resourcesByType.storage.find((s) => {
            return s.resourceId === configuredStorage.resourceId;
          });

          if (onChainStorage === undefined) {
            return null;
          }

          return {
            resourceType: "storage",
            onChainResource: onChainStorage,
            configuredResource: configuredStorage,
          } as const;
        })
        .filter(Boolean),
      {
        resourceType: "ip",
        onChainResource: peer.resourcesByType.ip,
        configuredResource: configuredPeer.resourcesByType.ip,
      },
      {
        resourceType: "bandwidth",
        onChainResource: peer.resourcesByType.bandwidth,
        configuredResource: configuredPeer.resourcesByType.bandwidth,
      },
    ];

    const [firstTx, ...restTxs] = (
      await Promise.all(
        resourceSupplyAndDetailsUpdates.map(async (update) => {
          return createResourceSupplyAndDetailsUpdateTx(
            peer.id,
            configuredPeer.name,
            update,
          );
        }),
      )
    )
      .flat()
      .filter(Boolean);

    if (firstTx === undefined) {
      continue;
    }

    firstTx.description = `\nFor ${configuredPeer.name}:\n${firstTx.description}`;
    txs.push(firstTx, ...restTxs);
  }

  return txs;
}

type ResourceUpdate =
  | {
      resourceType: ResourceType;
      onChainResource: ResourceInfo | undefined;
      configuredResource: ResourceInfo;
      unitIds?: string[];
    }
  | {
      resourceType: ResourceType;
      onChainResource: ResourceInfo;
      configuredResource: ResourceInfo | undefined;
      unitIds?: string[];
    };

async function createResourceUpdateTx(
  peerId: string,
  {
    resourceType,
    onChainResource,
    configuredResource,
    unitIds,
  }: ResourceUpdate,
) {
  const txs: Txs = [];
  const { contracts } = await getContracts();

  function removeResource() {
    if (
      !(
        onChainResource !== undefined &&
        (configuredResource === undefined ||
          onChainResource.resourceId !== configuredResource.resourceId)
      )
    ) {
      return;
    }

    const description = `Removing ${resourceType} resource with id ${onChainResource.resourceId}`;

    if (resourceType === "cpu") {
      assert(
        unitIds !== undefined,
        "Unit ids must be included for CPU resource",
      );

      txs.push(
        ...unitIds.map((computeUnit, i) => {
          return {
            ...(i === 0 ? { description } : {}),
            tx: populateTx(
              contracts.diamond.removeComputeUnitV2,
              computeUnit,
              onChainResource.resourceId,
            ),
          };
        }),
      );
    } else {
      txs.push({
        description,
        tx: populateTx(
          contracts.diamond.removePeerResource,
          peerId,
          onChainResource.resourceId,
        ),
      });
    }
  }

  function addResource() {
    if (
      !(
        configuredResource !== undefined &&
        (onChainResource === undefined ||
          onChainResource.resourceId !== configuredResource.resourceId)
      )
    ) {
      return;
    }

    const description = `Adding ${resourceType} resource with id ${configuredResource.resourceId}`;

    if (resourceType === "cpu") {
      assert(
        unitIds !== undefined,
        "Unit ids must be included for CPU resource",
      );

      txs.push(
        ...unitIds.map((computeUnit, i) => {
          const CUIds = [computeUnit];
          return {
            ...(i === 0 ? { description } : {}),
            tx: populateTx(contracts.diamond.addComputeUnitsV2, peerId, CUIds, {
              ...configuredResource,
              supply: CUIds.length * VCPU_PER_CU,
            }),
          };
        }),
      );
    } else {
      txs.push({
        description,
        tx: populateTx(
          contracts.diamond.registerPeerResource,
          peerId,
          configuredResource,
        ),
      });
    }
  }

  // We do this so that there is always enough ram
  if (resourceType === "ram") {
    addResource();
    removeResource();
  } else {
    removeResource();
    addResource();
  }

  return txs;
}

async function populatePeerResourcesTxs({
  computePeersFromProviderConfig,
  offerIndexerInfo,
}: OnChainOffer) {
  const txs: { description?: string; tx: ReturnType<typeof populateTx> }[] = [];

  for (const {
    resourcesByType,
    name: peerName,
    peerId,
  } of computePeersFromProviderConfig) {
    const peerIdHex = await uint8ArrayToPeerIdHexString(peerId);

    const onChainPeer = offerIndexerInfo.peers.find((peer) => {
      return peer.id === peerIdHex;
    });

    if (onChainPeer === undefined) {
      continue;
    }

    const ram = {
      resourceType: "ram",
      onChainResource: onChainPeer.resourcesByType.ram,
      configuredResource: resourcesByType.ram,
    } as const;

    const cpu = {
      resourceType: "cpu",
      onChainResource: onChainPeer.resourcesByType.cpu,
      configuredResource: resourcesByType.cpu,
      unitIds: onChainPeer.computeUnits.map(({ id }) => {
        return id;
      }),
    } as const;

    const resourceUpdates = [
      // If CPU supply becomes smaller, we need to update CPU first, because if we possibly decrease RAM first, we might not have enough RAM for CPU
      ...(cpu.onChainResource.supply > cpu.configuredResource.supply
        ? [cpu, ram]
        : [ram, cpu]),
      ...resourcesByType.storage.map((configuredStorage) => {
        const onChainStorage = onChainPeer.resourcesByType.storage.find((s) => {
          return s.resourceId === configuredStorage.resourceId;
        });

        return {
          resourceType: "storage",
          onChainResource: onChainStorage,
          configuredResource: configuredStorage,
        } as const;
      }),
      ...onChainPeer.resourcesByType.storage.map((onChainStorage) => {
        const configuredStorage = resourcesByType.storage.find((s) => {
          return s.resourceId === onChainStorage.resourceId;
        });

        return {
          resourceType: "storage",
          onChainResource: onChainStorage,
          configuredResource: configuredStorage,
        } as const;
      }),
      {
        resourceType: "ip",
        onChainResource: onChainPeer.resourcesByType.ip,
        configuredResource: resourcesByType.ip,
      },
      {
        resourceType: "bandwidth",
        onChainResource: onChainPeer.resourcesByType.bandwidth,
        configuredResource: resourcesByType.bandwidth,
      },
    ] as const;

    const [firstTx, ...restTxs] = (
      await Promise.all(
        resourceUpdates.flatMap(async (update) => {
          return createResourceUpdateTx(onChainPeer.id, update);
        }),
      )
    ).flat();

    if (firstTx === undefined) {
      continue;
    }

    assert(
      firstTx.description !== undefined,
      "createResourceUpdateTx ensures that description is set for first tx",
    );

    firstTx.description = `\nFor ${peerName}:\n${firstTx.description}`;
    txs.push(firstTx, ...restTxs);
  }

  return txs;
}

async function populateOfferRemoveTx({ offerId }: OnChainOffer) {
  const { contracts } = await getContracts();
  return {
    description: `\nRemoving offer: ${offerId}`,
    tx: populateTx(contracts.diamond.removeOfferV2, offerId),
  };
}

async function populateCUToAddTxs(
  { computePeersFromProviderConfig }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const { contracts } = await getContracts();

  const computeUnitsToAdd = peersOnChain.flatMap(
    ({ peerIdBase58, hexPeerId, computeUnits, resourcesByType: resources }) => {
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
          resources,
        },
      ];
    },
  );

  return computeUnitsToAdd.flatMap(
    ({ hexPeerId, unitIds, peerIdBase58, resources }) => {
      return unitIds.map((CUId, i) => {
        const CUIds = [CUId];

        return {
          ...(i === 0
            ? {
                description: `\nAdding ${numToStr(unitIds.length)} compute units to peer ${peerIdBase58}`,
              }
            : {}),
          tx: populateTx(
            contracts.diamond.addComputeUnitsV2,
            hexPeerId,
            CUIds,
            { ...resources.cpu, supply: CUIds.length * VCPU_PER_CU },
          ),
        };
      });
    },
  );
}

function getAddMissingComputePeers(
  { computePeersFromProviderConfig, offerId, offerName }: OnChainOffer,
  peersOnChain: PeersOnChain,
) {
  const allCPs = computePeersFromProviderConfig.filter(({ peerIdBase58 }) => {
    return !peersOnChain.some((p) => {
      return p.peerIdBase58 === peerIdBase58;
    });
  });

  return allCPs.length === 0
    ? null
    : {
        async execute() {
          await addRemainingCPs({ allCPs, offerId, offerName });
        },
        computePeerNames: allCPs.map(({ name }) => {
          return name;
        }),
      };
}

type AddMissingComputePeers = ReturnType<typeof getAddMissingComputePeers>;

function printOffersToUpdateInfo(
  populatedTxs: Awaited<ReturnType<typeof populateUpdateOffersTxs>>,
) {
  commandObj.logToStderr(
    `Offers to update:\n\n${populatedTxs
      .flatMap(
        ({
          offerId,
          offerName,
          removePeersFromOffersTxs,
          txs,
          addMissingComputePeers,
        }) => {
          const allTxs = [...removePeersFromOffersTxs, ...txs];

          if (allTxs.length === 0 && addMissingComputePeers === null) {
            return [];
          }

          const addMissingComputePeersMessage =
            addMissingComputePeers === null
              ? null
              : `Add missing compute peers:\n${addMissingComputePeers.computePeerNames.join(
                  "\n",
                )}`;

          const allTxsMessage =
            allTxs.length === 0
              ? null
              : allTxs
                  .filter((tx): tx is typeof tx & { description: string } => {
                    return "description" in tx;
                  })
                  .map(({ description }) => {
                    return description;
                  })
                  .join("\n");

          return [
            `Offer ${color.green(offerName)} with id ${color.yellow(
              offerId,
            )}:\n\n${[allTxsMessage, addMissingComputePeersMessage].filter(Boolean).join("\n")}\n`,
          ];
        },
      )
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
