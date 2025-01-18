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
import { join } from "node:path";

import { describe, expect } from "vitest";

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
  sign,
} from "../../src/lib/dealClient.js";
import { stringifyUnknown } from "../../src/lib/helpers/stringifyUnknown.js";
import { numToStr } from "../../src/lib/helpers/typesafeStringify.js";
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

  wrappedTest("create offer with newly added resources", async () => {
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

    const resources = getEventValues({
      txReceipt: createResourcesTxReceipt,
      contract: contracts.diamond,
      eventName: "ResourceCreated",
      value: "resources",
    });

    assert(
      resources.every((resource) => {
        return (
          typeof resource === "object" &&
          resource !== null &&
          "resourceId" in resource
        );
      }),
      "All ResourceCreated events must have resourceId and ty",
    );

    const providerConfig = await initProviderConfigWithPath(cwd);

    Object.values(providerConfig.computePeers).forEach((computePeer) => {
      computePeer.resources.cpu.name = CPU_RESOURCE_NAME;
      computePeer.resources.ram.name = RAM_RESOURCE_NAME;

      computePeer.resources.storage.forEach((s) => {
        s.name = STORAGE_RESOURCE_NAME;
      });

      computePeer.resources.bandwidth.name = BANDWIDTH_RESOURCE_NAME;
      computePeer.resources.ip.name = IP_RESOURCE_NAME;
    });

    const [defaultOfferName] = Object.keys(providerConfig.offers);

    assert(
      defaultOfferName !== undefined &&
        providerConfig.offers[defaultOfferName] !== undefined,
      "Default offer must exist in the provider config",
    );

    const resourcePrices =
      providerConfig.offers[defaultOfferName].resourcePrices;

    resourcePrices.cpu = { [CPU_RESOURCE_NAME]: `1 ${CPU_PRICE_UNITS}` };
    resourcePrices.ram = { [RAM_RESOURCE_NAME]: `1 ${RAM_PRICE_UNITS}` };

    resourcePrices.storage = {
      [STORAGE_RESOURCE_NAME]: `1 ${STORAGE_PRICE_UNITS}`,
    };

    resourcePrices.bandwidth = {
      [BANDWIDTH_RESOURCE_NAME]: `1 ${BANDWIDTH_PRICE_UNITS}`,
    };

    resourcePrices.ip = { [IP_RESOURCE_NAME]: `1 ${IP_PRICE_UNITS}` };

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

    resources.forEach(({ resourceId }) => {
      assert(typeof resourceId === "string", "Resource id must be a string");

      expect(offerInfoWithNewResources).toEqual(
        expect.stringContaining(resourceId),
      );
    });
  });
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
