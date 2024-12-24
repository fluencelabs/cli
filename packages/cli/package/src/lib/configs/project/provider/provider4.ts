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
import { commandObj } from "../../../commandObj.js";
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

export const OPTIONAL_RESOURCE_DETAILS_STRING = "<optional>";
export const OPTIONAL_RESOURCE_DETAILS_NUMBER = 1;
export const OPTIONAL_RESOURCE_DETAILS_BOOLEAN = false;

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

type ResourceNames = Record<string, string>;

const resourceNamesSchema = {
  type: "object",
  description:
    "A map with resource names as keys and on-chain resource IDs as values",
  additionalProperties: idSchema,
  properties: {
    resourceName: idSchema,
  },
  required: [],
} as const satisfies JSONSchemaType<ResourceNames>;

export type ResourceNamesPerResourceType = Record<ResourceType, ResourceNames>;

const resourceNamesPerResourceTypeSchema = {
  type: "object",
  description:
    "A map with resource type names as keys and resource names object as values",
  additionalProperties: false,
  properties: {
    cpu: resourceNamesSchema,
    ram: resourceNamesSchema,
    storage: resourceNamesSchema,
    bandwidth: resourceNamesSchema,
    ip: resourceNamesSchema,
  },
  required: [],
} as const satisfies JSONSchemaType<ResourceNamesPerResourceType>;

type Resource = {
  name: string;
  supply: number;
};

const resourceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    supply: { type: "integer", minimum: 1 },
  },
  required: ["name", "supply"],
} as const satisfies JSONSchemaType<Resource>;

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

type PeerCPU = Resource & {
  details?: PeerCPUDetails;
};

const peerCPUSchema = {
  ...resourceSchema,
  description: "Defines a CPU resource",
  properties: {
    ...resourceSchema.properties,
    details: peerCPUDetailsSchema,
    supply: {
      type: "integer",
      minimum: 1,
      description: "Number of physical cores",
    },
  },
  required: resourceSchema.required,
} as const satisfies JSONSchemaType<PeerCPU>;

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

type PeerRAM = Resource & {
  details?: PeerRamDetails;
};

const peerRAMSchema = {
  ...resourceSchema,
  description: "Defines a RAM resource",
  properties: {
    ...resourceSchema.properties,
    details: peerRamDetailsSchema,
    supply: {
      type: "integer",
      minimum: 1,
      description: "Amount of RAM in GB",
    },
  },
  required: resourceSchema.required,
} as const satisfies JSONSchemaType<PeerRAM>;

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

type PeerStorage = Resource & {
  details?: PeerStorageDetails;
};

const peerStorageSchema = {
  ...resourceSchema,
  description: "Defines a storage resource",
  properties: {
    ...resourceSchema.properties,
    details: peerStorageDetailsSchema,
    supply: {
      type: "integer",
      minimum: 1,
      description: "Amount of storage in GB",
    },
  },
  required: resourceSchema.required,
} as const satisfies JSONSchemaType<PeerStorage>;

type Bandwidth = Resource;

const bandwidthSchema = {
  ...resourceSchema,
  description: "Defines a bandwidth resource",
  properties: {
    ...resourceSchema.properties,
    supply: {
      type: "integer",
      minimum: 1,
      description: "Bandwidth in Mbps",
    },
  },
  required: resourceSchema.required,
} as const satisfies JSONSchemaType<Bandwidth>;

type IP = PrevIp & {
  name: string;
};

const ipSchema = {
  ...prevIpSchema,
  description: "Defines an IP resource",
  properties: {
    ...prevIpSchema.properties,
    name: { type: "string" },
  },
  required: [...prevIpSchema.required, "name"],
  nullable: false,
} as const satisfies JSONSchemaType<IP>;

export type ComputePeerResources = {
  cpu: PeerCPU;
  ram: PeerRAM;
  storage: PeerStorage[];
  bandwidth: Bandwidth;
  ip: IP;
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
        bandwidth: bandwidthSchema,
        ip: ipSchema,
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
  resourceNames: ResourceNamesPerResourceType;
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
      resourceNames: resourceNamesPerResourceTypeSchema,
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
      resourceNames: getDefaultResourceNames(),
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
      validateNoDuplicateResourceIds(config),
      validateNoUnknownResourceNamesInComputePeers(config),
      validateOfferHasComputePeerResources(config),
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

export function getDefaultResourceNames(): ResourceNamesPerResourceType {
  // TODO: use real on-chain IDs here?
  return {
    cpu: {
      [CPU_RESOURCE_NAME]:
        "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC1",
    },
    ram: {
      [RAM_RESOURCE_NAME]:
        "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC2",
    },
    storage: {
      [STORAGE_RESOURCE_NAME]:
        "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC3",
    },
    bandwidth: {
      [BANDWIDTH_RESOURCE_NAME]:
        "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC4",
    },
    ip: {
      [IP_RESOURCE_NAME]:
        "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC5",
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
        details: {
          model: OPTIONAL_RESOURCE_DETAILS_STRING,
        },
      },
      ram: {
        name: RAM_RESOURCE_NAME,
        supply: 1,
        details: {
          ecc: OPTIONAL_RESOURCE_DETAILS_BOOLEAN,
          manufacturer: OPTIONAL_RESOURCE_DETAILS_STRING,
          model: OPTIONAL_RESOURCE_DETAILS_STRING,
          speed: OPTIONAL_RESOURCE_DETAILS_NUMBER,
        },
      },
      storage: [
        {
          name: STORAGE_RESOURCE_NAME,
          supply: 1,
          details: {
            manufacturer: OPTIONAL_RESOURCE_DETAILS_STRING,
            model: OPTIONAL_RESOURCE_DETAILS_STRING,
            sequentialWriteSpeed: OPTIONAL_RESOURCE_DETAILS_NUMBER,
          },
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

function validateNoDuplicateResourceIds({
  resourceNames: resourceNamesPerResourceType,
}: {
  resourceNames: ResourceNamesPerResourceType;
}): ValidationResult {
  const errorsPerResourceType = Object.entries(resourceNamesPerResourceType)
    .map(([resourceType, resourceNames]) => {
      const resourceNamesById = Object.entries(resourceNames).reduce<
        Record<string, string[]>
      >((acc, [name, id]) => {
        if (acc[id] === undefined) {
          acc[id] = [];
        }

        acc[id].push(name);
        return acc;
      }, {});

      const errors = Object.entries(resourceNamesById)
        .filter(([, names]) => {
          return names.length > 1;
        })
        .map(([id, names]) => {
          return `names: ${color.yellow(names.join(", "))} in ${color.yellow(`resourceNames.${resourceType}`)} property refer to the exact same Resource ID ${color.yellow(id)}`;
        });

      return errors.length === 0 ? true : errors.join("\n");
    })
    .filter((result) => {
      return typeof result === "string";
    });

  return errorsPerResourceType.length === 0
    ? true
    : errorsPerResourceType.join("\n");
}

function validateNoUnknownResourceNamesInComputePeers({
  resourceNames: resourceNamesPerResourceType,
  computePeers,
}: {
  resourceNames: ResourceNamesPerResourceType;
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
              if (
                resourceNamesPerResourceType[resourceType][name] === undefined
              ) {
                acc.push(`${resourceType}: ${name}`);
              }
            });
          } else if (
            resourceNamesPerResourceType[resourceType][resource.name] ===
            undefined
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

export function peerCPUDetailsToString({
  model,
}: PeerCPUDetails | undefined = {}) {
  const details: PeerCPUDetails = {};

  if (model !== undefined && model !== OPTIONAL_RESOURCE_DETAILS_STRING) {
    details["model"] = model;
  }

  return JSON.stringify(details);
}

export function peerRAMDetailsToString({
  manufacturer,
  model,
  speed,
  ecc,
}: PeerRamDetails | undefined = {}) {
  const details: PeerRamDetails = {};

  const isManufacturerDefined =
    manufacturer !== undefined &&
    manufacturer !== OPTIONAL_RESOURCE_DETAILS_STRING;

  if (isManufacturerDefined) {
    details["manufacturer"] = manufacturer;
  }

  const isModelDefined =
    model !== undefined && model !== OPTIONAL_RESOURCE_DETAILS_STRING;

  if (isModelDefined) {
    details["model"] = model;
  }

  const isSpeedDefined =
    speed !== undefined && speed !== OPTIONAL_RESOURCE_DETAILS_NUMBER;

  if (isSpeedDefined) {
    details["speed"] = speed;
  }

  const isEccDefined = ecc !== undefined;

  const isSomethingElseDefined =
    ecc !== OPTIONAL_RESOURCE_DETAILS_BOOLEAN ||
    isManufacturerDefined ||
    isModelDefined ||
    isSpeedDefined;

  if (isEccDefined && isSomethingElseDefined) {
    details["ecc"] = ecc;
  }

  return JSON.stringify(details);
}

export function peerStorageDetailsToString({
  manufacturer,
  model,
  sequentialWriteSpeed,
}: PeerStorageDetails | undefined = {}) {
  const details: PeerStorageDetails = {};

  if (
    manufacturer !== undefined &&
    manufacturer !== OPTIONAL_RESOURCE_DETAILS_STRING
  ) {
    details["manufacturer"] = manufacturer;
  }

  if (model !== undefined && model !== OPTIONAL_RESOURCE_DETAILS_STRING) {
    details["model"] = model;
  }

  if (
    sequentialWriteSpeed !== undefined &&
    sequentialWriteSpeed !== OPTIONAL_RESOURCE_DETAILS_NUMBER
  ) {
    details["sequentialWriteSpeed"] = sequentialWriteSpeed;
  }

  return JSON.stringify(details);
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

export function ipSupplyToIndividualIPs(supply: IPSupplies) {
  const ips = new Set<string>();

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
    return commandObj.error(`Invalid IP ranges:\n${errors.join("\n")}`);
  }

  validRanges.forEach((range) => {
    if ("mask" in range) {
      const { ip: ipParts, mask } = range;
      const numAddresses = Math.pow(2, 32 - mask);

      let ipNum =
        (ipParts[0] << 24) +
        (ipParts[1] << 16) +
        (ipParts[2] << 8) +
        ipParts[3];

      for (let i = 0; i < numAddresses; i++) {
        const newIp = [
          (ipNum >> 24) & 255,
          (ipNum >> 16) & 255,
          (ipNum >> 8) & 255,
          ipNum & 255,
        ].join(".");

        ips.add(newIp);
        ipNum++;
      }
    } else if ("end" in range) {
      const { start, end } = range;

      let startNum =
        (start[0] << 24) + (start[1] << 16) + (start[2] << 8) + start[3];

      const endNum = (end[0] << 24) + (end[1] << 16) + (end[2] << 8) + end[3];

      while (startNum <= endNum) {
        const ip = [
          (startNum >> 24) & 255,
          (startNum >> 16) & 255,
          (startNum >> 8) & 255,
          startNum & 255,
        ].join(".");

        ips.add(ip);
        startNum++;
      }
    } else {
      const { start } = range;
      const ip = start.join(".");
      ips.add(ip);
    }
  });

  return Array.from(ips);
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
