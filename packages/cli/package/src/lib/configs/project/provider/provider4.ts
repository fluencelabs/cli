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

type PeerVCPUDetails = {
  model?: string;
};

const peerVCPUDetailsSchema = {
  type: "object",
  description:
    "CPU details not related to matching but visible to the user for information purposes",
  additionalProperties: false,
  properties: {
    model: { type: "string", nullable: true },
  },
  required: [],
  nullable: true,
} as const satisfies JSONSchemaType<PeerVCPUDetails>;

type PeerVCPU = Resource & {
  details?: PeerVCPUDetails;
};

const peerVCPUSchema = {
  ...resourceSchema,
  description: "Defines a vCPU resource",
  properties: {
    ...resourceSchema.properties,
    details: peerVCPUDetailsSchema,
    supply: {
      type: "integer",
      minimum: 1,
      description: "Number of vCPU cores. Currently it's 1 vCPU per 1 CPU core",
    },
  },
  required: resourceSchema.required,
} as const satisfies JSONSchemaType<PeerVCPU>;

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

type ComputePeerResources = {
  vcpu: PeerVCPU;
  ram: PeerRAM;
  storage: PeerStorage[];
  bandwidth: Bandwidth;
  ip: IP;
};

type ResourceType = keyof ComputePeerResources;

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
        vcpu: peerVCPUSchema,
        ram: peerRAMSchema,
        storage: { type: "array", items: peerStorageSchema },
        bandwidth: bandwidthSchema,
        ip: ipSchema,
      },
      required: ["vcpu", "ram", "storage", "bandwidth", "ip"],
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

type OfferResources = Record<ResourceType, OfferResource>;

const offerResourcesSchema = {
  type: "object",
  description: "Resource prices for the offer",
  additionalProperties: false,
  properties: {
    vcpu: offerResourceSchema,
    ram: offerResourceSchema,
    storage: offerResourceSchema,
    bandwidth: offerResourceSchema,
    ip: offerResourceSchema,
  },
  required: ["vcpu", "ram", "storage", "bandwidth", "ip"],
} as const satisfies JSONSchemaType<OfferResources>;

type Offer = {
  computePeers: Array<string>;
  resources: OfferResources;
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
    resources: offerResourcesSchema,
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
  resourceNames: ResourceNames;
  providerName: string;
  capacityCommitments: CapacityCommitments;
  computePeers: ComputePeers;
  offers: Offers;
};

const VCPU_RESOURCE_NAME = "<vcpuResourceName>";
const RAM_RESOURCE_NAME = "<ramResourceName>";
const STORAGE_RESOURCE_NAME = "<storageResourceName>";
const BANDWIDTH_RESOURCE_NAME = "shared";
const IP_RESOURCE_NAME = "ipv4";

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      resourceNames: resourceNamesSchema,
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
        return [name, { computePeers, resources: getDefaultOfferResources() }];
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
      // TODO: validate 4 GB RAM per 1 vCPU
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

export function getDefaultResourceNames(): ResourceNames {
  // TODO: use real on-chain IDs here?
  return {
    [VCPU_RESOURCE_NAME]:
      "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC1",
    [RAM_RESOURCE_NAME]:
      "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC2",
    [STORAGE_RESOURCE_NAME]:
      "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC3",
    [BANDWIDTH_RESOURCE_NAME]:
      "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC4",
    [IP_RESOURCE_NAME]:
      "111122223333444455556666777788889999AAAABBBBCCCCDDDDEEEEFFFFCCC5",
  };
}

export function getDefaultOfferResources(): OfferResources {
  return {
    vcpu: { [VCPU_RESOURCE_NAME]: 1 },
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
      vcpu: {
        name: VCPU_RESOURCE_NAME,
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
        ...(resources?.ip ?? { supply: [{ start: "0.0.0.0" }] }),
      },
    },
  };
}

function validateNoDuplicateResourceIds({
  resourceNames,
}: {
  resourceNames: ResourceNames;
}): ValidationResult {
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
      return `Resource ID ${color.yellow(id)} has multiple names in resourceNames property: ${names.join(", ")}`;
    });

  return errors.length === 0 ? true : errors.join("\n");
}

function validateNoUnknownResourceNamesInComputePeers({
  resourceNames,
  computePeers,
}: {
  resourceNames: ResourceNames;
  computePeers: ComputePeers;
}): ValidationResult {
  const errors = Object.entries(computePeers).reduce<string[]>(
    (acc, [peerName, { resources }]) => {
      const unknownResourceNames = Object.entries(resources).reduce<string[]>(
        (acc, [resourceType, resource]) => {
          if (Array.isArray(resource)) {
            resource.forEach(({ name }) => {
              if (resourceNames[name] === undefined) {
                acc.push(`${resourceType}: ${name}`);
              }
            });
          } else if (resourceNames[resource.name] === undefined) {
            acc.push(`${resourceType}: ${resource.name}`);
          }

          return acc;
        },
        [],
      );

      if (unknownResourceNames.length > 0) {
        acc.push(
          `Compute peer ${color.yellow(peerName)} has resource names, not found in resourceNames property:\n${unknownResourceNames.join("\n")}`,
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
    (acc, [offerName, { computePeers, resources: offerResources }]) => {
      const offerResourcesSets: Record<ResourceType, Set<string>> = {
        vcpu: new Set(Object.keys(offerResources.vcpu)),
        ram: new Set(Object.keys(offerResources.ram)),
        storage: new Set(Object.keys(offerResources.storage)),
        bandwidth: new Set(Object.keys(offerResources.bandwidth)),
        ip: new Set(Object.keys(offerResources.ip)),
      };

      const extraOfferResourcesSets: Record<ResourceType, Set<string>> = {
        vcpu: new Set(offerResourcesSets.vcpu),
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

      const missingResources = presentComputePeers.reduce<string[]>(
        (acc, [peerName, peer]) => {
          const validateResource = getValidateResource(
            peer.resources,
            offerResourcesSets,
            extraOfferResourcesSets,
          );

          const errors: Record<ResourceType, string[]> = {
            vcpu: validateResource("vcpu"),
            ram: validateResource("ram"),
            storage: validateResource("storage"),
            bandwidth: validateResource("bandwidth"),
            ip: validateResource("ip"),
          };

          const missing = Object.entries(errors).reduce<string[]>(
            (acc, [type, errors]) => {
              if (errors.length > 0) {
                acc.push(`${type}: ${errors.join(", ")}`);
              }

              return acc;
            },
            [],
          );

          if (missing.length > 0) {
            acc.push(
              `compute peer ${color.yellow(peerName)} resources:\n${missing.join("\n")}`,
            );
          }

          return acc;
        },
        [],
      );

      if (missingResources.length > 0) {
        acc.push(
          `Offer ${color.yellow(offerName)} is missing resources defined in compute peers:\n${missingResources.join("\n")}`,
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
