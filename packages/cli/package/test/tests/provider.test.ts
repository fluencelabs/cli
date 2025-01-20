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
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect } from "vitest";
import { stringify } from "yaml";

import {
  LOCAL_NET_DEFAULT_ACCOUNTS,
  LOCAL_NET_DEFAULT_WALLET_KEY,
} from "../../src/common.js";
import { getConfigInitFunction } from "../../src/lib/configs/initConfigNew.js";
import {
  initProviderConfig,
  options as providerConfigOptions,
} from "../../src/lib/configs/project/provider/provider.js";
import {
  dataCenterToHumanReadableString,
  OnChainResourceType,
  type CPUMetadata,
  type RAMMetadata,
  type StorageMetadata,
  type BandwidthMetadata,
  type IPMetadata,
  cpuResourceToHumanReadableString,
  ramResourceToHumanReadableString,
  storageResourceToHumanReadableString,
  bandwidthResourceToHumanReadableString,
  ipResourceToHumanReadableString,
  CPU_PRICE_UNITS,
  RAM_PRICE_UNITS,
  STORAGE_PRICE_UNITS,
  BANDWIDTH_PRICE_UNITS,
  IP_PRICE_UNITS,
} from "../../src/lib/configs/project/provider/provider4.js";
import {
  OFFER_FLAG_NAME,
  PRIV_KEY_FLAG_NAME,
  PROVIDER_CONFIG_FULL_FILE_NAME,
} from "../../src/lib/const.js";
import {
  getContractsByPrivKey,
  getEventValue,
  getEventValues,
  populateTx,
  sign,
  signBatch,
} from "../../src/lib/dealClient.js";
import { stringifyUnknown } from "../../src/lib/helpers/stringifyUnknown.js";
import { numToStr } from "../../src/lib/helpers/typesafeStringify.js";
import { removeProperties } from "../../src/lib/helpers/utils.js";
import { fluence } from "../helpers/commonWithSetupTests.js";
import { CC_DURATION_SECONDS } from "../helpers/constants.js";
import { initializeTemplate } from "../helpers/sharedSteps.js";
import { sleepSeconds, wrappedTest } from "../helpers/utils.js";

const PRIV_KEY_1 = {
  [PRIV_KEY_FLAG_NAME]: LOCAL_NET_DEFAULT_ACCOUNTS[1].privateKey,
};

async function initProviderConfigWithPath(
  path: string,
): Promise<NonNullable<Awaited<ReturnType<typeof initProviderConfig>>>> {
  // @ts-expect-error Don't know how to solve this error but it's valid
  const providerConfig = await getConfigInitFunction({
    ...providerConfigOptions,
    reset: true,
    getConfigPath() {
      return join(path, PROVIDER_CONFIG_FULL_FILE_NAME);
    },
  })();

  assert(
    providerConfig !== null,
    "Provider config must already exists in a quickstart template",
  );

  // @ts-expect-error Don't know how to solve this error but it's valid
  return providerConfig;
}

describe("provider tests", () => {
  wrappedTest(
    "should be able to register and update provider with a new name",
    async () => {
      const cwd = join("test", "tmp", "fullLifeCycle");
      await initializeTemplate(cwd);
      const providerConfig = await initProviderConfigWithPath(cwd);

      // add extra capacity commitments and compute peers not used in any offer
      providerConfig.capacityCommitments = Object.fromEntries(
        Object.values(providerConfig.capacityCommitments).map((config, i) => {
          return [
            `peer-${numToStr(i)}`,
            { ...config, duration: `${numToStr(CC_DURATION_SECONDS)} seconds` },
          ] as const;
        }),
      );

      const NEW_OFFER_NAME = "newOffer";
      const [defaultOffer] = Object.values(providerConfig.offers);

      assert(
        defaultOffer !== undefined,
        "Default offer must exist in the provider config",
      );

      providerConfig.offers = { [NEW_OFFER_NAME]: defaultOffer };
      const PROVIDER_NAME = "AwesomeProvider";
      providerConfig.providerName = PROVIDER_NAME;
      await providerConfig.$commit();

      const TEST_DEFAULT = {
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: NEW_OFFER_NAME,
        },
        cwd,
      } as const;

      await fluence({
        args: ["provider", "tokens-distribute"],
        flags: {
          ...TEST_DEFAULT.flags,
          amount: "10",
        },
        cwd,
      });

      await fluence({ args: ["provider", "register"], flags: PRIV_KEY_1, cwd });
      await checkProviderNameIsCorrect(cwd, PROVIDER_NAME);
      const NEW_PROVIDER_NAME = "NewAwesomeProvider";
      providerConfig.providerName = NEW_PROVIDER_NAME;
      await providerConfig.$commit();
      await fluence({ args: ["provider", "update"], flags: PRIV_KEY_1, cwd });
      await checkProviderNameIsCorrect(cwd, NEW_PROVIDER_NAME);

      await fluence({
        args: ["provider", "offer-create"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-create"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-activate"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await sleepSeconds(5);

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await sleepSeconds(CC_DURATION_SECONDS);

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-finish"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "cc-info"],
        ...TEST_DEFAULT,
      });

      await fluence({
        args: ["provider", "offer-remove"],
        ...TEST_DEFAULT,
      });
    },
  );

  wrappedTest(
    "create offer with newly added datacenter, update datacenter",
    async () => {
      const cwd = join("test", "tmp", "addDatacenter");
      await initializeTemplate(cwd);

      const { contracts, providerOrWallet } = await getContractsByPrivKey(
        LOCAL_NET_DEFAULT_WALLET_KEY,
      );

      const countryCode = "BY";
      const cityCode = "MNSK";
      const cityIndex = "0";
      const tier = 3;
      const NO_CERTIFICATIONS = "NO_CERTIFICATIONS";
      const certifications = [NO_CERTIFICATIONS];

      const createDatacenterTxReceipt = await sign({
        title: 'Create datacenter with "NO_CERTIFICATIONS" certifications',
        method: contracts.diamond.createDatacenter,
        args: [
          { countryCode, cityCode, index: cityIndex, tier, certifications },
        ],
        providerOrWallet,
      });

      const createdDatacenterId = getEventValue({
        txReceipt: createDatacenterTxReceipt,
        contract: contracts.diamond,
        eventName: "DatacenterCreated",
        value: "id",
      });

      assert(
        typeof createdDatacenterId === "string",
        "Datacenter id must be a string",
      );

      const providerConfig = await initProviderConfigWithPath(cwd);
      const [defaultOffer] = Object.keys(providerConfig.offers);

      assert(
        defaultOffer !== undefined &&
          providerConfig.offers[defaultOffer] !== undefined,
        "Default offer must exist in the provider config",
      );

      providerConfig.offers[defaultOffer].dataCenterName =
        dataCenterToHumanReadableString({
          countryCode,
          cityCode,
          cityIndex,
        });

      await providerConfig.$commit();

      await fluence({ args: ["provider", "register"], flags: PRIV_KEY_1, cwd });

      await fluence({
        args: ["provider", "offer-create"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: defaultOffer,
        },
        cwd,
      });

      const offerInfoWithNewDatacenter = await fluence({
        args: ["provider", "offer-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: defaultOffer,
        },
        cwd,
      });

      expect(offerInfoWithNewDatacenter).toEqual(
        expect.stringContaining(`countryCode: ${countryCode}`),
      );

      expect(offerInfoWithNewDatacenter).toEqual(
        expect.stringContaining(`tier: "${numToStr(tier)}"`),
      );

      expect(offerInfoWithNewDatacenter).toEqual(
        expect.stringContaining(NO_CERTIFICATIONS),
      );

      const NEW_CERTIFICATIONS = "ALL_CERTIFICATIONS";
      const newTier = 4;

      await sign({
        title: `Update datacenter with new certifications: ${NEW_CERTIFICATIONS} and new tier: ${numToStr(newTier)}`,
        method: contracts.diamond.updateDatacenter,
        args: [createdDatacenterId, newTier, [NEW_CERTIFICATIONS]],
        providerOrWallet,
      });

      const offerInfoWithUpdatedDatacenter = await fluence({
        args: ["provider", "offer-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: defaultOffer,
        },
        cwd,
      });

      expect(offerInfoWithUpdatedDatacenter).toEqual(
        expect.stringContaining(`countryCode: ${countryCode}`),
      );

      expect(offerInfoWithUpdatedDatacenter).toEqual(
        expect.stringContaining(`tier: "${numToStr(newTier)}"`),
      );

      expect(offerInfoWithUpdatedDatacenter).toEqual(
        expect.stringContaining(NEW_CERTIFICATIONS),
      );
    },
  );

  wrappedTest(
    "create offer with newly added resources, update resources",
    async () => {
      const cwd = join("test", "tmp", "addResources");
      await initializeTemplate(cwd);

      const { contracts, providerOrWallet } = await getContractsByPrivKey(
        LOCAL_NET_DEFAULT_WALLET_KEY,
      );

      const CPU_RESOURCE_METADATA: CPUMetadata = {
        manufacturer: "Fluence",
        brand: "F1",
        architecture: "RISC-V",
        generation: "1",
      };

      const CPU_RESOURCE_NAME = cpuResourceToHumanReadableString(
        CPU_RESOURCE_METADATA,
      );

      const RAM_RESOURCE_METADATA: RAMMetadata = {
        type: "DDR",
        generation: "6",
      };

      const RAM_RESOURCE_NAME = ramResourceToHumanReadableString(
        RAM_RESOURCE_METADATA,
      );

      const STORAGE_RESOURCE_METADATA: StorageMetadata = {
        type: "HDD",
      };

      const STORAGE_RESOURCE_NAME = storageResourceToHumanReadableString(
        STORAGE_RESOURCE_METADATA,
      );

      const BANDWIDTH_RESOURCE_METADATA: BandwidthMetadata = {
        type: "semi-dedicated",
      };

      const BANDWIDTH_RESOURCE_NAME = bandwidthResourceToHumanReadableString(
        BANDWIDTH_RESOURCE_METADATA,
      );

      const IP_RESOURCE_METADATA: IPMetadata = {
        version: "8",
      };

      const IP_RESOURCE_NAME =
        ipResourceToHumanReadableString(IP_RESOURCE_METADATA);

      const createResourcesTxReceipt = await sign({
        title: "Create resources",
        method: contracts.diamond.registerResources,
        args: [
          [
            {
              ty: OnChainResourceType.VCPU,
              metadata: JSON.stringify(CPU_RESOURCE_METADATA),
            },
            {
              ty: OnChainResourceType.RAM,
              metadata: JSON.stringify(RAM_RESOURCE_METADATA),
            },
            {
              ty: OnChainResourceType.STORAGE,
              metadata: JSON.stringify(STORAGE_RESOURCE_METADATA),
            },
            {
              ty: OnChainResourceType.NETWORK_BANDWIDTH,
              metadata: JSON.stringify(BANDWIDTH_RESOURCE_METADATA),
            },
            {
              ty: OnChainResourceType.PUBLIC_IP,
              metadata: JSON.stringify(IP_RESOURCE_METADATA),
            },
          ],
        ],
        providerOrWallet,
      });

      const [
        cpuResourceId,
        ramResourceId,
        storageResourceId,
        bandwidthResourceId,
        ipResourceId,
      ] = getEventValues({
        txReceipt: createResourcesTxReceipt,
        contract: contracts.diamond,
        eventName: "ResourceCreated",
        value: "resourceId",
      });

      assert(
        typeof cpuResourceId === "string" &&
          typeof ramResourceId === "string" &&
          typeof storageResourceId === "string" &&
          typeof bandwidthResourceId === "string" &&
          typeof ipResourceId === "string",
        "All ResourceCreated events must have string resourceId",
      );

      const providerConfig = await initProviderConfigWithPath(cwd);

      function setResourceNamesInConfig({
        cpuName,
        ramName,
        storageName,
        bandwidthName,
        ipName,
      }: {
        cpuName: string;
        ramName: string;
        storageName: string;
        bandwidthName: string;
        ipName: string;
      }) {
        Object.values(providerConfig.computePeers).forEach((computePeer) => {
          computePeer.resources.cpu.name = cpuName;
          computePeer.resources.ram.name = ramName;

          computePeer.resources.storage.forEach((s) => {
            s.name = storageName;
          });

          computePeer.resources.bandwidth.name = bandwidthName;
          computePeer.resources.ip.name = ipName;
        });

        const [defaultOfferName] = Object.keys(providerConfig.offers);

        assert(
          defaultOfferName !== undefined &&
            providerConfig.offers[defaultOfferName] !== undefined,
          "Default offer must exist in the provider config",
        );

        const resourcePrices =
          providerConfig.offers[defaultOfferName].resourcePrices;

        resourcePrices.cpu = { [cpuName]: `1 ${CPU_PRICE_UNITS}` };
        resourcePrices.ram = { [ramName]: `1 ${RAM_PRICE_UNITS}` };

        resourcePrices.storage = {
          [storageName]: `1 ${STORAGE_PRICE_UNITS}`,
        };

        resourcePrices.bandwidth = {
          [bandwidthName]: `1 ${BANDWIDTH_PRICE_UNITS}`,
        };

        resourcePrices.ip = { [ipName]: `1 ${IP_PRICE_UNITS}` };

        return defaultOfferName;
      }

      const defaultOfferName = setResourceNamesInConfig({
        cpuName: CPU_RESOURCE_NAME,
        ramName: RAM_RESOURCE_NAME,
        storageName: STORAGE_RESOURCE_NAME,
        bandwidthName: BANDWIDTH_RESOURCE_NAME,
        ipName: IP_RESOURCE_NAME,
      });

      await providerConfig.$commit();

      await fluence({ args: ["provider", "register"], flags: PRIV_KEY_1, cwd });

      await fluence({
        args: ["provider", "offer-create"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: defaultOfferName,
        },
        cwd,
      });

      const offerInfoWithNewResources = await fluence({
        args: ["provider", "offer-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: defaultOfferName,
        },
        cwd,
      });

      [
        cpuResourceId,
        ramResourceId,
        storageResourceId,
        bandwidthResourceId,
        ipResourceId,
      ].forEach((resourceId) => {
        expect(offerInfoWithNewResources).toEqual(
          expect.stringContaining(resourceId),
        );
      });

      const CPU_RESOURCE_METADATA_UPDATED: CPUMetadata = {
        ...CPU_RESOURCE_METADATA,
        generation: "2",
      };

      const CPU_RESOURCE_NAME_UPDATED = cpuResourceToHumanReadableString(
        CPU_RESOURCE_METADATA_UPDATED,
      );

      const RAM_RESOURCE_METADATA_UPDATED: RAMMetadata = {
        ...RAM_RESOURCE_METADATA,
        generation: "7",
      };

      const RAM_RESOURCE_NAME_UPDATED = ramResourceToHumanReadableString(
        RAM_RESOURCE_METADATA_UPDATED,
      );

      const STORAGE_RESOURCE_METADATA_UPDATED: StorageMetadata = {
        ...STORAGE_RESOURCE_METADATA,
        type: "ODD",
      };

      const STORAGE_RESOURCE_NAME_UPDATED =
        storageResourceToHumanReadableString(STORAGE_RESOURCE_METADATA_UPDATED);

      const BANDWIDTH_RESOURCE_METADATA_UPDATED: BandwidthMetadata = {
        ...BANDWIDTH_RESOURCE_METADATA,
        type: "semi-shared",
      };

      const BANDWIDTH_RESOURCE_NAME_UPDATED =
        bandwidthResourceToHumanReadableString(
          BANDWIDTH_RESOURCE_METADATA_UPDATED,
        );

      const IP_RESOURCE_METADATA_UPDATED: IPMetadata = {
        ...IP_RESOURCE_METADATA,
        version: "10",
      };

      const IP_RESOURCE_NAME_UPDATED = ipResourceToHumanReadableString(
        IP_RESOURCE_METADATA_UPDATED,
      );

      await signBatch({
        title: "Update resources metadata",
        populatedTxs: [
          populateTx(
            contracts.diamond.updateResourceMetadata,
            cpuResourceId,
            JSON.stringify(CPU_RESOURCE_METADATA_UPDATED),
          ),
          populateTx(
            contracts.diamond.updateResourceMetadata,
            ramResourceId,
            JSON.stringify(RAM_RESOURCE_METADATA_UPDATED),
          ),
          populateTx(
            contracts.diamond.updateResourceMetadata,
            storageResourceId,
            JSON.stringify(STORAGE_RESOURCE_METADATA_UPDATED),
          ),
          populateTx(
            contracts.diamond.updateResourceMetadata,
            bandwidthResourceId,
            JSON.stringify(BANDWIDTH_RESOURCE_METADATA_UPDATED),
          ),
          populateTx(
            contracts.diamond.updateResourceMetadata,
            ipResourceId,
            JSON.stringify(IP_RESOURCE_METADATA_UPDATED),
          ),
        ],
        providerOrWallet,
      });

      await expect(async () => {
        await fluence({
          args: ["provider", "gen"],
          flags: PRIV_KEY_1,
          cwd,
        });
      }).rejects.toThrow();

      setResourceNamesInConfig({
        cpuName: CPU_RESOURCE_NAME_UPDATED,
        ramName: RAM_RESOURCE_NAME_UPDATED,
        storageName: STORAGE_RESOURCE_NAME_UPDATED,
        bandwidthName: BANDWIDTH_RESOURCE_NAME_UPDATED,
        ipName: IP_RESOURCE_NAME_UPDATED,
      });

      await writeFile(
        providerConfig.$getPath(),
        stringify(
          removeProperties(providerConfig, ([, v]) => {
            return typeof v === "function";
          }),
        ),
        "utf8",
      );

      await fluence({
        args: ["provider", "gen"],
        flags: PRIV_KEY_1,
        cwd,
      });

      const offerInfoWithUpdatedResources = await fluence({
        args: ["provider", "offer-info"],
        flags: {
          ...PRIV_KEY_1,
          [OFFER_FLAG_NAME]: defaultOfferName,
        },
        cwd,
      });

      expect(offerInfoWithUpdatedResources).toEqual(
        expect.stringContaining(BANDWIDTH_RESOURCE_METADATA_UPDATED.type),
      );
    },
  );
});

async function checkProviderNameIsCorrect(cwd: string, providerName: string) {
  try {
    await fluence({ args: ["provider", "register"], flags: PRIV_KEY_1, cwd });
    new Error("Provider din't throw error when trying to register it twice");
  } catch (e) {
    const stringifiedError = stringifyUnknown(e);

    assert(
      stringifiedError.includes(providerName),
      `CLI error message must contain current actual provider name: ${providerName}. Got: ${stringifiedError}`,
    );
  }
}
