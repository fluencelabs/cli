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

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import isEmpty from "lodash-es/isEmpty.js";

import { versions } from "../../../../versions.js";
import { numToStr } from "../../../helpers/typesafeStringify.js";
import { splitErrorsAndResults } from "../../../helpers/utils.js";
import {
  validateBatchAsync,
  type ValidationResult,
} from "../../../helpers/validations.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import { providerNameSchema } from "./provider0.js";
import {
  ipSchema as prevIpSchema,
  kubeconfigPathSchema,
  type IP as PrevIp,
  type IPSupplies,
} from "./provider1.js";
import {
  type Config as PrevConfig,
  capacityCommitmentsSchema,
  validateNoDuplicatePeerNamesInOffers,
  type CapacityCommitments,
  validateCC,
  validateProtocolVersions,
} from "./provider3.js";

const OPTIONAL_RESOURCE_DETAILS_STRING = "<optional>";
const OPTIONAL_RESOURCE_DETAILS_NUMBER = 1;
const OPTIONAL_RESOURCE_DETAILS_BOOLEAN = false;

const idSchema = {
  description: "On-chain ID of the resource",
  type: "string",
  minLength: 64,
  maxLength: 64,
  pattern: "^[0-9a-fA-F]+$",
  // TODO: get this from chain and add dynamically add it to schema
  //   oneOf: [
  //     {
  //       const: "5465737456616c75654f6642797465733332",
  //       description: `manufacturer: AMD
  // brand: EPYC
  // architecture: Zen
  // generation: 3`,
  //     },
  //     {
  //       const: "5465737456616c75654f6642797465733333",
  //       description: `manufacturer: Intel
  // brand: Xeon
  // architecture: Ice Lake
  // generation: 3`,
  //     },
  //   ],
} as const satisfies JSONSchemaType<string>;

type Resource = {
  id: string;
};

type PeerCPUDetails = {
  model?: string;
};

const peerCPUDetailsSchema = {
  type: "object",
  description:
    "CPU details not related to matching but visible to the user for information purposes",
  additionalProperties: false,
  properties: {
    model: { type: "string", nullable: true },
  },
  required: [],
  nullable: true,
} as const satisfies JSONSchemaType<PeerCPUDetails>;

type CPUResource = Resource & {
  details?: PeerCPUDetails;
};

const cpuResourceSchema = {
  type: "object",
  description: "Defines a CPU resource",
  properties: {
    id: idSchema,
    details: peerCPUDetailsSchema,
  },
  required: ["id"],
} as const satisfies JSONSchemaType<CPUResource>;

type CPUResources = Record<string, CPUResource>;

const cpuResourcesSchema = {
  type: "object",
  description:
    "A map with CPU resource names as keys and CPU resource objects as values",
  additionalProperties: cpuResourceSchema,
  properties: { cpuResourceName: cpuResourceSchema },
  required: [],
} as const satisfies JSONSchemaType<CPUResources>;

type PeerRamDetails = {
  manufacturer?: string;
  model?: string;
  speed?: number;
  ecc?: boolean;
};

const peerRamDetailsSchema = {
  type: "object",
  additionalProperties: false,
  description:
    "RAM details not related to matching but visible to the user for information purposes",
  properties: {
    manufacturer: { type: "string", nullable: true },
    model: { type: "string", nullable: true },
    speed: { type: "integer", nullable: true, minimum: 1 },
    ecc: { type: "boolean", nullable: true },
  },
  required: [],
  nullable: true,
} as const satisfies JSONSchemaType<PeerRamDetails>;

type RamResource = Resource & {
  details?: PeerRamDetails;
};

const ramResourceSchema = {
  type: "object",
  description: "Defines a RAM resource",
  properties: {
    id: idSchema,
    details: peerRamDetailsSchema,
  },
  required: ["id"],
} as const satisfies JSONSchemaType<RamResource>;

type RamResources = Record<string, RamResource>;

const ramResourcesSchema = {
  type: "object",
  description:
    "A map with RAM resource names as keys and RAM resource objects as values",
  additionalProperties: ramResourceSchema,
  properties: { ramResourceName: ramResourceSchema },
  required: [],
} as const satisfies JSONSchemaType<RamResources>;

type PeerStorageDetails = {
  manufacturer?: string;
  model?: string;
  sequentialWriteSpeed?: number;
};

const peerStorageDetailsSchema = {
  type: "object",
  additionalProperties: false,
  description:
    "Storage details not related to matching but visible to the user for information purposes",
  properties: {
    manufacturer: { type: "string", nullable: true },
    model: { type: "string", nullable: true },
    sequentialWriteSpeed: { type: "number", nullable: true },
  },
  required: [],
  nullable: true,
} as const satisfies JSONSchemaType<PeerStorageDetails>;

type StorageResource = Resource & {
  details?: PeerStorageDetails;
};

const storageResourceSchema = {
  type: "object",
  description: "Defines a storage resource",
  properties: {
    id: idSchema,
    details: peerStorageDetailsSchema,
  },
  required: ["id"],
} as const satisfies JSONSchemaType<StorageResource>;

type StorageResources = Record<string, StorageResource>;

const storageResourcesSchema = {
  type: "object",
  description:
    "A map with storage resource names as keys and storage resource objects as values",
  additionalProperties: storageResourceSchema,
  properties: { storageResourceName: storageResourceSchema },
  required: [],
} as const satisfies JSONSchemaType<StorageResources>;

type BandwidthResource = Resource;

const bandwidthResourceSchema = {
  type: "object",
  description: "Defines a bandwidth resource",
  properties: {
    id: idSchema,
  },
  required: ["id"],
} as const satisfies JSONSchemaType<BandwidthResource>;

type BandwidthResources = Record<string, BandwidthResource>;

const bandwidthResourcesSchema = {
  type: "object",
  description:
    "A map with bandwidth resource names as keys and bandwidth resource objects as values",
  additionalProperties: bandwidthResourceSchema,
  properties: { bandwidthResourceName: bandwidthResourceSchema },
  required: [],
} as const satisfies JSONSchemaType<BandwidthResources>;

type IPResource = Resource;

const ipResourceSchema = {
  type: "object",
  description: "Defines an IP resource",
  properties: {
    id: idSchema,
  },
  required: ["id"],
} as const satisfies JSONSchemaType<IPResource>;

type IPResources = Record<string, IPResource>;

const ipResourcesSchema = {
  type: "object",
  description:
    "A map with IP resource names as keys and IP resource objects as values",
  additionalProperties: ipResourceSchema,
  properties: { ipResourceName: ipResourceSchema },
  required: [],
} as const satisfies JSONSchemaType<IPResources>;

export type ResourcePerResourceType = {
  cpu: CPUResources;
  ram: RamResources;
  storage: StorageResources;
  bandwidth: BandwidthResources;
  ip: IPResources;
};

const resourcesPerResourceTypeSchema = {
  type: "object",
  description:
    "A map with resource type names as keys and resource names object as values",
  additionalProperties: false,
  properties: {
    cpu: cpuResourcesSchema,
    ram: ramResourcesSchema,
    storage: storageResourcesSchema,
    bandwidth: bandwidthResourcesSchema,
    ip: ipResourcesSchema,
  },
  required: [],
} as const satisfies JSONSchemaType<ResourcePerResourceType>;

type PeerResource = {
  name: string;
  supply: number;
};

const peerResourceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    supply: { type: "integer", minimum: 1 },
  },
  required: ["name", "supply"],
} as const satisfies JSONSchemaType<PeerResource>;

const OVERRIDE_OR_EXTEND_DEDSCRIPTION = `Override or extend `;

type PeerCPU = PeerResource & {
  details?: PeerCPUDetails;
};

const peerCPUSchema = {
  ...peerResourceSchema,
  description: "Defines a CPU resource",
  properties: {
    ...peerResourceSchema.properties,
    details: {
      ...peerCPUDetailsSchema,
      description: `${OVERRIDE_OR_EXTEND_DEDSCRIPTION}${peerCPUDetailsSchema.description}`,
    },
    supply: {
      type: "integer",
      minimum: 1,
      description: "Number of physical cores",
    },
  },
  required: peerResourceSchema.required,
} as const satisfies JSONSchemaType<PeerCPU>;

type PeerRAM = PeerResource & {
  details?: PeerRamDetails;
};

const peerRAMSchema = {
  ...peerResourceSchema,
  description: "Defines a RAM resource",
  properties: {
    ...peerResourceSchema.properties,
    details: {
      ...peerRamDetailsSchema,
      description: `${OVERRIDE_OR_EXTEND_DEDSCRIPTION}${peerRamDetailsSchema.description}`,
    },
    supply: {
      type: "integer",
      minimum: 1,
      description: "Amount of RAM in GB",
    },
  },
  required: peerResourceSchema.required,
} as const satisfies JSONSchemaType<PeerRAM>;

type PeerStorage = PeerResource & {
  details?: PeerStorageDetails;
};

const peerStorageSchema = {
  ...peerResourceSchema,
  description: "Defines a storage resource",
  properties: {
    ...peerResourceSchema.properties,
    details: {
      ...peerStorageDetailsSchema,
      description: `${OVERRIDE_OR_EXTEND_DEDSCRIPTION}${peerStorageDetailsSchema.description}`,
    },
    supply: {
      type: "integer",
      minimum: 1,
      description: "Amount of storage in GB",
    },
  },
  required: peerResourceSchema.required,
} as const satisfies JSONSchemaType<PeerStorage>;

type PeerBandwidth = PeerResource;

const peerBandwidthSchema = {
  ...peerResourceSchema,
  description: "Defines a bandwidth resource",
  properties: {
    ...peerResourceSchema.properties,
    supply: {
      type: "integer",
      minimum: 1,
      description: "Bandwidth in Mbps",
    },
  },
  required: peerResourceSchema.required,
} as const satisfies JSONSchemaType<PeerBandwidth>;

type PeerIP = PrevIp & {
  name: string;
};

const peerIpSchema = {
  ...prevIpSchema,
  description: "Defines an IP resource",
  properties: {
    ...prevIpSchema.properties,
    name: { type: "string" },
  },
  required: [...prevIpSchema.required, "name"],
  nullable: false,
} as const satisfies JSONSchemaType<PeerIP>;

export type ComputePeerResources = {
  cpu: PeerCPU;
  ram: PeerRAM;
  storage: PeerStorage[];
  bandwidth: PeerBandwidth;
  ip: PeerIP;
};

export type ResourceType = keyof ComputePeerResources;

export type ComputePeer = {
  kubeconfigPath: string;
  resources: ComputePeerResources;
};

const computePeerSchema = {
  type: "object",
  description: "Defines a compute peer",
  properties: {
    kubeconfigPath: {
      ...kubeconfigPathSchema,
      nullable: false,
    },
    resources: {
      type: "object",
      additionalProperties: false,
      description: "Resources available on this compute peer",
      properties: {
        cpu: peerCPUSchema,
        ram: peerRAMSchema,
        storage: { type: "array", items: peerStorageSchema },
        bandwidth: peerBandwidthSchema,
        ip: peerIpSchema,
      },
      required: ["cpu", "ram", "storage", "bandwidth", "ip"],
    },
  },
  required: ["kubeconfigPath", "resources"],
} as const satisfies JSONSchemaType<ComputePeer>;

type ComputePeers = Record<string, ComputePeer>;

const computePeersSchema = {
  type: "object",
  description:
    "A map with compute peer names as keys and compute peer configs as values",
  additionalProperties: computePeerSchema,
  properties: { computePeerName: computePeerSchema },
  required: [],
} as const satisfies JSONSchemaType<ComputePeers>;

type OfferResource = Record<string, number>;

const offerResourceSchema = {
  type: "object",
  additionalProperties: { type: "number", minimum: 0 },
  required: [],
} as const satisfies JSONSchemaType<OfferResource>;

export type ResourcePrices = Record<ResourceType, OfferResource>;

const offerResourcesSchema = {
  type: "object",
  description: "Resource prices for the offer",
  additionalProperties: false,
  properties: {
    cpu: offerResourceSchema,
    ram: offerResourceSchema,
    storage: offerResourceSchema,
    bandwidth: offerResourceSchema,
    ip: offerResourceSchema,
  },
  required: ["cpu", "ram", "storage", "bandwidth", "ip"],
} as const satisfies JSONSchemaType<ResourcePrices>;

type Offer = {
  computePeers: Array<string>;
  resourcePrices: ResourcePrices;
  minProtocolVersion?: number;
  maxProtocolVersion?: number;
};

const offerSchema = {
  type: "object",
  description: "Defines a provider offer",
  additionalProperties: false,
  properties: {
    computePeers: {
      description: "Compute peers participating in this offer",
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
    },
    resourcePrices: offerResourcesSchema,
    minProtocolVersion: {
      type: "integer",
      description: `Min protocol version. Must be less then or equal to maxProtocolVersion. Default: ${numToStr(
        versions.protocolVersion,
      )}`,
      nullable: true,
      default: versions.protocolVersion,
      minimum: 1,
    },
    maxProtocolVersion: {
      type: "integer",
      description: `Max protocol version. Must be more then or equal to minProtocolVersion. Default: ${numToStr(
        versions.protocolVersion,
      )}`,
      nullable: true,
      default: versions.protocolVersion,
      minimum: 1,
    },
  },
  required: ["computePeers"],
} as const satisfies JSONSchemaType<Offer>;

type Offers = Record<string, Offer>;

const offersSchema = {
  description: "A map with offer names as keys and offer configs as values",
  type: "object",
  additionalProperties: offerSchema,
  properties: { Offer: offerSchema },
  required: [],
} as const satisfies JSONSchemaType<Offers>;

export type Config = {
  resources: ResourcePerResourceType;
  providerName: string;
  capacityCommitments: CapacityCommitments;
  computePeers: ComputePeers;
  offers: Offers;
};

const CPU_RESOURCE_NAME = "<cpuResourceName>";
const RAM_RESOURCE_NAME = "<ramResourceName>";
const STORAGE_RESOURCE_NAME = "<storageResourceName>";
const BANDWIDTH_RESOURCE_NAME = "shared";
const IP_RESOURCE_NAME = "ipv4";

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      resources: resourcesPerResourceTypeSchema,
      providerName: providerNameSchema,
      computePeers: computePeersSchema,
      capacityCommitments: capacityCommitmentsSchema,
      offers: offersSchema,
    },
    required: ["computePeers", "offers", "providerName", "capacityCommitments"],
  },
  migrate({ computePeers, capacityCommitments, offers, providerName }) {
    const newComputePeers = Object.fromEntries(
      Object.entries(computePeers).map(
        ([
          name,
          {
            computeUnits,
            kubeconfigPath,
            resources,
            nox: { vm: { network: { vmIp } = {} } = {} } = {},
          },
        ]) => {
          return [
            name,
            defaultComputePeerConfig({
              kubeconfigPath,
              name,
              computeUnits,
              resources:
                resources ??
                (vmIp === undefined
                  ? undefined
                  : { ip: { supply: [{ start: vmIp }] } }),
            }),
          ];
        },
      ),
    );

    const newOffers = Object.fromEntries(
      // TODO: protocol versions
      Object.entries(offers).map(([name, { computePeers }]) => {
        return [
          name,
          { computePeers, resourcePrices: getDefaultOfferResources() },
        ];
      }),
    );

    return {
      providerName,
      resources: getDefaultResources(),
      computePeers: newComputePeers,
      offers: newOffers,
      capacityCommitments,
    };
  },
  validate(config) {
    return validateBatchAsync(
      // TODO: validate 4 GB RAM per 1 CPU core
      validateCC(config),
      validateNoDuplicatePeerNamesInOffers(config),
      validateProtocolVersions(config),
      validateNoUnknownResourceNamesInComputePeers(config),
      validateOfferHasComputePeerResources(config),
      validateComputePeerIPs(config),
    );
  },
} satisfies ConfigOptions<PrevConfig, Config>;

type DefaultComputePeerConfigArgs = {
  name: string;
  computeUnits: number;
  kubeconfigPath?: string | undefined;
  resources?:
    | {
        ip: PrevIp;
      }
    | undefined;
};

const DEFAULT_CPU_DETAILS: PeerCPUDetails = {
  model: OPTIONAL_RESOURCE_DETAILS_STRING,
};

const DEFAULT_RAM_DETAILS: PeerRamDetails = {
  manufacturer: OPTIONAL_RESOURCE_DETAILS_STRING,
  model: OPTIONAL_RESOURCE_DETAILS_STRING,
  speed: OPTIONAL_RESOURCE_DETAILS_NUMBER,
  ecc: OPTIONAL_RESOURCE_DETAILS_BOOLEAN,
};

const DEFAULT_STORAGE_DETAILS: PeerStorageDetails = {
  manufacturer: OPTIONAL_RESOURCE_DETAILS_STRING,
  model: OPTIONAL_RESOURCE_DETAILS_STRING,
  sequentialWriteSpeed: OPTIONAL_RESOURCE_DETAILS_NUMBER,
};

export function getDefaultResources(): ResourcePerResourceType {
  // TODO: use real on-chain IDs here?
  return {
    cpu: {
      [CPU_RESOURCE_NAME]: {
        id: "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC1",
        details: DEFAULT_CPU_DETAILS,
      },
    },
    ram: {
      [RAM_RESOURCE_NAME]: {
        id: "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC2",
        details: DEFAULT_RAM_DETAILS,
      },
    },
    storage: {
      [STORAGE_RESOURCE_NAME]: {
        id: "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC3",
        details: DEFAULT_STORAGE_DETAILS,
      },
    },
    bandwidth: {
      [BANDWIDTH_RESOURCE_NAME]: {
        id: "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC4",
      },
    },
    ip: {
      [IP_RESOURCE_NAME]: {
        id: "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC5",
      },
    },
  };
}

export function getDefaultOfferResources(): ResourcePrices {
  return {
    cpu: { [CPU_RESOURCE_NAME]: 1 },
    ram: { [RAM_RESOURCE_NAME]: 1 },
    storage: { [STORAGE_RESOURCE_NAME]: 1 },
    bandwidth: { [BANDWIDTH_RESOURCE_NAME]: 1 },
    ip: { [IP_RESOURCE_NAME]: 1 },
  };
}

export function defaultComputePeerConfig({
  kubeconfigPath,
  name,
  computeUnits,
  resources,
}: DefaultComputePeerConfigArgs): ComputePeer {
  return {
    kubeconfigPath: kubeconfigPath ?? `./path-to-${name}-kubeconfig`,
    resources: {
      cpu: {
        name: CPU_RESOURCE_NAME,
        supply: computeUnits < 1 ? 1 : computeUnits,
        details: DEFAULT_CPU_DETAILS,
      },
      ram: {
        name: RAM_RESOURCE_NAME,
        supply: 1,
        details: DEFAULT_RAM_DETAILS,
      },
      storage: [
        {
          name: STORAGE_RESOURCE_NAME,
          supply: 1,
          details: DEFAULT_STORAGE_DETAILS,
        },
      ],
      bandwidth: { name: BANDWIDTH_RESOURCE_NAME, supply: 1 },
      ip: {
        name: IP_RESOURCE_NAME,
        ...(resources?.ip ?? { supply: [{ start: "1.1.1.1" }] }),
      },
    },
  };
}

function validateNoUnknownResourceNamesInComputePeers({
  resources: resourcesPerResourceType,
  computePeers,
}: {
  resources: ResourcePerResourceType;
  computePeers: ComputePeers;
}): ValidationResult {
  const errors = Object.entries(computePeers).reduce<string[]>(
    (acc, [peerName, { resources }]) => {
      const unknownResourceNames = Object.entries(resources).reduce<string[]>(
        (acc, [resourceTypeString, resource]) => {
          // here there is no good way to avoid type assertion
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          const resourceType = resourceTypeString as ResourceType;

          if (Array.isArray(resource)) {
            resource.forEach(({ name }) => {
              if (resourcesPerResourceType[resourceType][name] === undefined) {
                acc.push(`${resourceType}: ${name}`);
              }
            });
          } else if (
            resourcesPerResourceType[resourceType][resource.name] === undefined
          ) {
            acc.push(`${resourceType}: ${resource.name}`);
          }

          return acc;
        },
        [],
      );

      if (unknownResourceNames.length > 0) {
        acc.push(
          `Compute peer ${color.yellow(peerName)} has resource names that are not found in resourceNames property:\n${unknownResourceNames.join("\n")}`,
        );
      }

      return acc;
    },
    [],
  );

  return errors.length === 0 ? true : errors.join("\n");
}

function validateOfferHasComputePeerResources(config: {
  offers: Offers;
  computePeers: ComputePeers;
}) {
  if (isEmpty(config.computePeers)) {
    return `There should be at least one computePeer defined in the config`;
  }

  const offers = Object.entries(config.offers);

  if (offers.length === 0) {
    return `There should be at least one offer defined in the config`;
  }

  const errors = offers.reduce<string[]>(
    (acc, [offerName, { computePeers, resourcePrices }]) => {
      const offerResourcesSets: Record<ResourceType, Set<string>> = {
        cpu: new Set(Object.keys(resourcePrices.cpu)),
        ram: new Set(Object.keys(resourcePrices.ram)),
        storage: new Set(Object.keys(resourcePrices.storage)),
        bandwidth: new Set(Object.keys(resourcePrices.bandwidth)),
        ip: new Set(Object.keys(resourcePrices.ip)),
      };

      const extraOfferResourcesSets: Record<ResourceType, Set<string>> = {
        cpu: new Set(offerResourcesSets.cpu),
        ram: new Set(offerResourcesSets.ram),
        storage: new Set(offerResourcesSets.storage),
        bandwidth: new Set(offerResourcesSets.bandwidth),
        ip: new Set(offerResourcesSets.ip),
      };

      const [missingComputePeers, presentComputePeers] = splitErrorsAndResults(
        computePeers,
        (peerName) => {
          const peer = config.computePeers[peerName];
          return peer === undefined
            ? { error: peerName }
            : { result: [peerName, peer] as const };
        },
      );

      if (missingComputePeers.length > 0) {
        acc.push(
          `Offer ${color.yellow(
            offerName,
          )} has computePeers missing from the config's top level computePeers property: ${color.yellow(
            missingComputePeers.join(", "),
          )}`,
        );
      }

      const missingResources = presentComputePeers.reduce<
        {
          peerName: string;
          resourceType: ResourceType;
          resourceNames: string[];
        }[]
      >((acc, [peerName, peer]) => {
        const validateResource = getValidateResource(
          peer.resources,
          offerResourcesSets,
          extraOfferResourcesSets,
        );

        const missingResourceNamesPerType: Record<ResourceType, string[]> = {
          cpu: validateResource("cpu"),
          ram: validateResource("ram"),
          storage: validateResource("storage"),
          bandwidth: validateResource("bandwidth"),
          ip: validateResource("ip"),
        };

        const missingResourceNames = Object.entries(
          missingResourceNamesPerType,
        ).reduce<
          {
            peerName: string;
            resourceType: ResourceType;
            resourceNames: string[];
          }[]
        >((acc, [resourceType, resourceNames]) => {
          if (resourceNames.length > 0) {
            acc.push({
              peerName,
              // here there is no good way to avoid type assertion
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              resourceType: resourceType as ResourceType,
              resourceNames,
            });
          }

          return acc;
        }, []);

        if (missingResourceNames.length > 0) {
          acc.push(...missingResourceNames);
        }

        return acc;
      }, []);

      if (missingResources.length > 0) {
        const missing = Object.entries(
          missingResources.reduce<
            Record<ResourceType, Record<string, string[]>>
          >(
            (acc, { peerName, resourceNames, resourceType }) => {
              const resourceNamesPerType = acc[resourceType];

              resourceNames.forEach((resourceName) => {
                if (resourceNamesPerType[resourceName] === undefined) {
                  resourceNamesPerType[resourceName] = [];
                }

                resourceNamesPerType[resourceName].push(peerName);
              });

              return acc;
            },
            {
              cpu: {},
              ram: {},
              storage: {},
              bandwidth: {},
              ip: {},
            },
          ),
        )
          .filter(([, resourceNamesPerType]) => {
            return Object.keys(resourceNamesPerType).length > 0;
          })
          .map(([resourceType, resourceNamesPerType]) => {
            return `${color.yellow(resourceType)}: ${Object.entries(
              resourceNamesPerType,
            )
              .map(([resourceName, peerNames]) => {
                return `${color.yellow(resourceName)} (present in peers: ${peerNames.join(", ")})`;
              })
              .join(", ")}`;
          })
          .join("\n");

        acc.push(
          `Offer ${color.yellow(offerName)} is missing resources:\n${missing}`,
        );
      }

      const extraOfferResources = Object.entries(extraOfferResourcesSets)
        .map(([resourceType, resoureSet]) => {
          if (resoureSet.size > 0) {
            return `${resourceType}: ${Array.from(resoureSet).join(", ")}`;
          }

          return true;
        })
        .filter((result) => {
          return typeof result === "string";
        });

      if (extraOfferResources.length > 0) {
        acc.push(
          `Offer ${color.yellow(offerName)} has extra resources not found in it's compute peers:\n${extraOfferResources.join("\n")}`,
        );
      }

      return acc;
    },
    [],
  );

  return errors.length === 0 ? true : errors.join("\n");
}

function getValidateResource(
  computePeerResources: ComputePeerResources,
  offerResourcesSets: Record<ResourceType, Set<string>>,
  extraOfferResourcesSets: Record<ResourceType, Set<string>>,
): (resourceType: ResourceType) => string[] {
  return function validateResource(resourceType: ResourceType): string[] {
    const resource = computePeerResources[resourceType];

    if (Array.isArray(resource)) {
      return resource
        .map(({ name }) => {
          extraOfferResourcesSets[resourceType].delete(name);

          if (!offerResourcesSets[resourceType].has(name)) {
            return name;
          }

          return true;
        })
        .filter((result) => {
          return typeof result === "string";
        });
    }

    extraOfferResourcesSets[resourceType].delete(resource.name);

    if (!offerResourcesSets[resourceType].has(resource.name)) {
      return [resource.name];
    }

    return [];
  };
}

type IpRange =
  | {
      ip: IPv4;
      mask: number;
    }
  | {
      start: IPv4;
      end?: IPv4;
    };

// TODO: export this from deal-ts-clients
export enum OnChainResourceType {
  VCPU,
  RAM,
  STORAGE,
  PUBLIC_IP,
  NETWORK_BANDWIDTH,
  GPU,
}

export const resourceTypeToOnChainResourceType: Record<
  ResourceType,
  OnChainResourceType
> = {
  cpu: OnChainResourceType.VCPU,
  ram: OnChainResourceType.RAM,
  storage: OnChainResourceType.STORAGE,
  bandwidth: OnChainResourceType.NETWORK_BANDWIDTH,
  ip: OnChainResourceType.PUBLIC_IP,
};

function validateComputePeerIPs({
  computePeers,
}: {
  computePeers: ComputePeers;
}) {
  const errors = Object.entries(computePeers).reduce<string[]>(
    (acc, [peerName, { resources }]) => {
      const res = ipSupplyToIndividualIPs(resources.ip.supply);

      if ("error" in res) {
        acc.push(
          `Compute peer ${color.yellow(peerName)} has invalid IPs in the supply:\n${res.error}`,
        );
      }

      return acc;
    },
    [],
  );

  return errors.length === 0 ? true : errors.join("\n");
}

export function ipSupplyToIndividualIPs(
  supply: IPSupplies,
): { error: string } | { result: string[] } {
  const [errors, validRanges] = splitErrorsAndResults(
    supply,
    (s): { error: string } | { result: IpRange } => {
      if ("cidr" in s) {
        const commonError = `Invalid cidr: ${s.cidr}. `;
        const [baseIp, bits] = s.cidr.split("/");

        if (baseIp === undefined) {
          return { error: `${commonError}Expected to have "/" character` };
        }

        if (bits === undefined) {
          return {
            error: `${commonError}Expected to have bits after "/" character`,
          };
        }

        const mask = parseInt(bits, 10);
        const ipRes = stringToIp(baseIp);

        if ("error" in ipRes) {
          return { error: `${commonError}${ipRes.error}` };
        }

        if (isNaN(mask) || mask < 0 || mask > 32) {
          return {
            error: `${commonError}Expected mask to be an integer between 0 and 32`,
          };
        }

        return { result: { ip: ipRes.result, mask } };
      }

      const startRes = stringToIp(s.start);

      if ("error" in startRes) {
        return {
          error: `Invalid IP range start: ${s.start}. ${startRes.error}`,
        };
      }

      if (!("end" in s)) {
        return { result: { start: startRes.result } };
      }

      const endRes = stringToIp(s.end);

      if ("error" in endRes) {
        return {
          error: `Invalid IP range end: ${s.end}. ${endRes.error}`,
        };
      }

      return { result: { start: startRes.result, end: endRes.result } };
    },
  );

  if (errors.length > 0) {
    return { error: `Invalid IP ranges:\n${errors.join("\n")}` };
  }

  const ips = new Set<string>();
  const duplicatedIps = new Set<string>();

  function addIp(ip: string) {
    if (ips.has(ip)) {
      duplicatedIps.add(ip);
    } else {
      ips.add(ip);
    }
  }

  validRanges.forEach((range) => {
    if ("mask" in range) {
      const { ip: ipParts, mask } = range;
      const numAddresses = Math.pow(2, 32 - mask);
      let ipNum = ipToIpNum(ipParts);

      for (let i = 0; i < numAddresses; i++) {
        addIp(ipNumToIpStr(ipNum));
        ipNum++;
      }
    } else if ("end" in range) {
      const { end, start } = range;
      const endNum = ipToIpNum(end);
      let startNum = ipToIpNum(start);

      while (startNum <= endNum) {
        addIp(ipNumToIpStr(startNum));
        startNum++;
      }
    } else {
      const { start } = range;
      addIp(start.join("."));
    }
  });

  if (duplicatedIps.size > 0) {
    return {
      error: `IPs are duplicated:\n${Array.from(duplicatedIps).join("\n")}`,
    };
  }

  return { result: Array.from(ips) };
}

function ipNumToIpStr(ipNum: number) {
  return [
    (ipNum >> 24) & 255,
    (ipNum >> 16) & 255,
    (ipNum >> 8) & 255,
    ipNum & 255,
  ].join(".");
}

function ipToIpNum(ip: IPv4) {
  return (ip[0] << 24) + (ip[1] << 16) + (ip[2] << 8) + ip[3];
}

type IPv4 = [number, number, number, number];

function stringToIp(str: string): { result: IPv4 } | { error: string } {
  const parts = str.split(".").map(Number);
  const [first, second, third, fourth, ...rest] = parts;

  if (
    rest.length > 0 ||
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
  ) {
    return {
      error: `Expected to have 4 parts divided by "." character. Got: ${numToStr(parts.length)}`,
    };
  }

  if (
    parts.some((p) => {
      return isNaN(p) || p < 0 || p > 255;
    })
  ) {
    return {
      error: `Expected each part divided by "." character to be an integer between 0 and 255`,
    };
  }

  return { result: [first, second, third, fourth] };
}

export function mergeCPUResources(
  { details: cpuResourceDetails, ...restCPURescource }: CPUResource,
  { details: peerCPUDetails, ...restPeerCPU }: PeerCPU,
) {
  return {
    ...restCPURescource,
    ...restPeerCPU,
    details: mergeCPUDetails(cpuResourceDetails, peerCPUDetails),
  };
}

function mergeCPUDetails(
  details: PeerCPUDetails | undefined,
  peerDetails: PeerCPUDetails | undefined,
): PeerCPUDetails {
  const cleanedDetails = removeOptionalCPUDetails(details);
  const cleanedPeerDetails = removeOptionalCPUDetails(peerDetails);
  return { ...cleanedDetails, ...cleanedPeerDetails };
}

function removeOptionalCPUDetails(
  details: PeerCPUDetails | undefined,
): PeerCPUDetails {
  if (details === undefined) {
    return {};
  }

  const { model } = details;
  const res: PeerCPUDetails = {};

  if (model !== undefined && model !== OPTIONAL_RESOURCE_DETAILS_STRING) {
    res.model = model;
  }

  return res;
}

export function mergeRAMResources(
  { details: ramResourceDetails, ...restRAMRescource }: RamResource,
  { details: peerRAMDetails, ...restPeerRAM }: PeerRAM,
) {
  return {
    ...restRAMRescource,
    ...restPeerRAM,
    details: mergeRAMDetails(ramResourceDetails, peerRAMDetails),
  };
}

function mergeRAMDetails(
  details: PeerRamDetails | undefined,
  peerDetails: PeerRamDetails | undefined,
): PeerRamDetails {
  const cleanedDetails = removeOptionalRAMDetails(details);
  const cleanedPeerDetails = removeOptionalRAMDetails(peerDetails);
  return { ...cleanedDetails, ...cleanedPeerDetails };
}

function removeOptionalRAMDetails(
  details: PeerRamDetails | undefined,
): PeerRamDetails {
  if (details === undefined) {
    return {};
  }

  const { manufacturer, model, speed, ecc } = details;
  const res: PeerRamDetails = {};

  if (
    manufacturer !== undefined &&
    manufacturer !== OPTIONAL_RESOURCE_DETAILS_STRING
  ) {
    res.manufacturer = manufacturer;
  }

  if (model !== undefined && model !== OPTIONAL_RESOURCE_DETAILS_STRING) {
    res.model = model;
  }

  if (speed !== undefined && speed !== OPTIONAL_RESOURCE_DETAILS_NUMBER) {
    res.speed = speed;
  }

  const allDetailsAreOptional =
    manufacturer === OPTIONAL_RESOURCE_DETAILS_STRING &&
    model === OPTIONAL_RESOURCE_DETAILS_STRING &&
    speed === OPTIONAL_RESOURCE_DETAILS_NUMBER &&
    ecc === OPTIONAL_RESOURCE_DETAILS_BOOLEAN;

  if (ecc !== undefined && !allDetailsAreOptional) {
    res.ecc = ecc;
  }

  return res;
}

export function mergeStorageResources(
  { details: storageResourceDetails, ...restStorageRescource }: StorageResource,
  { details: peerStorageDetails, ...restPeerStorage }: PeerStorage,
) {
  return {
    ...restStorageRescource,
    ...restPeerStorage,
    details: mergeStorageDetails(storageResourceDetails, peerStorageDetails),
  };
}

function mergeStorageDetails(
  details: PeerStorageDetails | undefined,
  peerDetails: PeerStorageDetails | undefined,
): PeerStorageDetails {
  const cleanedDetails = removeOptionalStorageDetails(details);
  const cleanedPeerDetails = removeOptionalStorageDetails(peerDetails);
  return { ...cleanedDetails, ...cleanedPeerDetails };
}

function removeOptionalStorageDetails(
  details: PeerStorageDetails | undefined,
): PeerStorageDetails {
  if (details === undefined) {
    return {};
  }

  const { manufacturer, model, sequentialWriteSpeed } = details;
  const res: PeerStorageDetails = {};

  if (
    manufacturer !== undefined &&
    manufacturer !== OPTIONAL_RESOURCE_DETAILS_STRING
  ) {
    res.manufacturer = manufacturer;
  }

  if (model !== undefined && model !== OPTIONAL_RESOURCE_DETAILS_STRING) {
    res.model = model;
  }

  if (
    sequentialWriteSpeed !== undefined &&
    sequentialWriteSpeed !== OPTIONAL_RESOURCE_DETAILS_NUMBER
  ) {
    res.sequentialWriteSpeed = sequentialWriteSpeed;
  }

  return res;
}

export function mergeBandwidthResources(
  bandwidthResource: BandwidthResource,
  peerBandwidth: PeerBandwidth,
) {
  return { ...bandwidthResource, ...peerBandwidth, details: {} };
}

export function mergeIPResources(ipResource: IPResource, peerIP: PeerIP) {
  return { ...ipResource, ...peerIP, details: {} };
}
