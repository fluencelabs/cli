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
import mapValues from "lodash-es/mapValues.js";

import { versions } from "../../../../versions.js";
import {
  ccDurationValidator,
  validateAddress,
  validateProtocolVersion,
} from "../../../chain/chainValidators.js";
import {
  PROVIDER_CONFIG_FULL_FILE_NAME,
  DEFAULT_CC_DURATION,
  DEFAULT_CC_STAKER_REWARD,
  DURATION_EXAMPLE,
} from "../../../const.js";
import {
  type ValidationResult,
  validateCIDs,
} from "../../../helpers/validations.js";
import { validateBatchAsync } from "../../../helpers/validations.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import { providerNameSchema } from "./provider0.js";
import {
  ccpConfigYAMLSchema,
  computePeersSchema,
  noxConfigYAMLSchema,
  type CCPConfigYAML,
  type ComputePeers,
  type NoxConfigYAML,
} from "./provider1.js";
import {
  offersSchema,
  type Offers,
  type Config as PrevConfig,
} from "./provider2.js";

type CapacityCommitment = {
  duration: string;
  stakerReward: number;
  delegator?: string;
};

const capacityCommitmentSchema = {
  type: "object",
  description: "Defines a capacity commitment",
  required: ["duration", "stakerReward"],
  additionalProperties: false,
  properties: {
    duration: {
      type: "string",
      default: DEFAULT_CC_DURATION,
      description: `Duration of the commitment ${DURATION_EXAMPLE}`,
    },
    delegator: {
      type: "string",
      description: "Delegator address",
      nullable: true,
    },
    stakerReward: {
      type: "number",
      minimum: 0,
      maximum: 100,
      description: "Staker reward in percent",
      default: DEFAULT_CC_STAKER_REWARD,
    },
  },
} as const satisfies JSONSchemaType<CapacityCommitment>;

export type CapacityCommitments = Record<string, CapacityCommitment>;

export const capacityCommitmentsSchema = {
  type: "object",
  description:
    "A map with nox names as keys and capacity commitments as values",
  additionalProperties: capacityCommitmentSchema,
  properties: {
    noxName: capacityCommitmentSchema,
  },
  required: [],
} as const satisfies JSONSchemaType<CapacityCommitments>;

export type Config = {
  providerName: string;
  capacityCommitments: CapacityCommitments;
  nox?: NoxConfigYAML;
  computePeers: ComputePeers;
  ccp?: CCPConfigYAML;
  offers: Offers;
};

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      providerName: providerNameSchema,
      computePeers: computePeersSchema,
      nox: noxConfigYAMLSchema,
      ccp: ccpConfigYAMLSchema,
      capacityCommitments: capacityCommitmentsSchema,
      offers: offersSchema,
    },
    required: ["computePeers", "offers", "providerName", "capacityCommitments"],
  },
  migrate(config) {
    return {
      ...config,
      capacityCommitments: mapValues(
        config.capacityCommitments,
        ({ rewardDelegationRate: stakerReward, ...cc }) => {
          return { ...cc, stakerReward };
        },
      ),
    };
  },
  validate(config) {
    return validateBatchAsync(
      validateCIDs(
        Object.entries(config.offers).flatMap(([name, { effectors }]) => {
          return (effectors ?? []).map((cid) => {
            return {
              cid,
              location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > offers > ${name} > effectors`,
            };
          });
        }),
      ),
      validateCIDs(
        Object.entries(config.nox?.effectors ?? {}).map(
          ([effectorName, { wasmCID: cid }]) => {
            return {
              cid,
              location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > nox > effectors > ${effectorName} > wasmCID`,
            };
          },
        ),
      ),
      validateCIDs(
        Object.entries(config.computePeers).flatMap(
          ([computePeerName, { nox }]) => {
            return Object.entries(nox?.effectors ?? {}).map(
              ([effectorName, { wasmCID: cid }]) => {
                return {
                  cid,
                  location: `${PROVIDER_CONFIG_FULL_FILE_NAME} > computePeers > ${computePeerName} > nox > effectors > ${effectorName} > wasmCID`,
                };
              },
            );
          },
        ),
      ),
      validateCC(config),
      validateMissingComputePeers(config),
      validateNoDuplicatePeerNamesInOffers(config),
      validateProtocolVersions(config),
    );
  },
} satisfies ConfigOptions<PrevConfig, Config>;

export async function validateProtocolVersions(providerConfig: {
  offers: Record<
    string,
    { maxProtocolVersion?: number; minProtocolVersion?: number }
  >;
}): Promise<ValidationResult> {
  const errors = (
    await Promise.all(
      Object.entries(providerConfig.offers).flatMap(
        ([
          offer,
          {
            maxProtocolVersion = versions.protocolVersion,
            minProtocolVersion = versions.protocolVersion,
          },
        ]) => {
          return [
            Promise.resolve({
              offer,
              property: "minProtocolVersion or maxProtocolVersion",
              validity:
                minProtocolVersion > maxProtocolVersion
                  ? `minProtocolVersion must be less than or equal to maxProtocolVersion. Got: minProtocolVersion=${color.yellow(
                      minProtocolVersion,
                    )} maxProtocolVersion=${color.yellow(maxProtocolVersion)}`
                  : true,
            }),
            ...(
              [
                ["minProtocolVersion", minProtocolVersion],
                ["maxProtocolVersion", maxProtocolVersion],
              ] as const
            ).map(async ([property, v]) => {
              return {
                offer,
                property,
                validity: await validateProtocolVersion(v),
              };
            }),
          ];
        },
      ),
    )
  ).filter((a): a is typeof a & { validity: string } => {
    return a.validity !== true;
  });

  if (errors.length > 0) {
    return errors
      .map(({ offer, property, validity }) => {
        return `Offer ${color.yellow(offer)} has invalid ${color.yellow(
          property,
        )} property: ${validity}`;
      })
      .join("\n");
  }

  return true;
}

export function validateNoDuplicatePeerNamesInOffers(config: {
  offers: Record<string, { computePeers: Array<string> }>;
}): ValidationResult {
  const noxNamesInOffers: Record<string, string[]> = {};

  Object.entries(config.offers).forEach(([offerName, { computePeers }]) => {
    computePeers.forEach((noxName) => {
      const arr = noxNamesInOffers[noxName];

      if (arr === undefined) {
        noxNamesInOffers[noxName] = [offerName];
      } else {
        arr.push(offerName);
      }
    });
  });

  const duplicateNoxNames = Object.entries(noxNamesInOffers).filter(
    ([, offerNames]) => {
      return offerNames.length > 1;
    },
  );

  if (duplicateNoxNames.length > 0) {
    return duplicateNoxNames
      .map(([noxName, offerNames]) => {
        return `Peer ${color.yellow(
          noxName,
        )} is present in multiple offers: ${color.yellow(
          offerNames.join(", "),
        )}`;
      })
      .join("\n");
  }

  return true;
}

export async function validateCC(config: {
  capacityCommitments: CapacityCommitments;
}): Promise<ValidationResult> {
  const validateCCDuration = await ccDurationValidator();

  const capacityCommitmentErrors = (
    await Promise.all(
      Object.entries(config.capacityCommitments).map(async ([name, cc]) => {
        const errors = [
          cc.delegator === undefined
            ? true
            : await validateAddress(cc.delegator),
          validateCCDuration(cc.duration),
        ].filter((e) => {
          return e !== true;
        });

        return errors.length === 0
          ? true
          : `Invalid capacity commitment for ${color.yellow(
              name,
            )}:\n${errors.join("\n")}`;
      }),
    )
  ).filter((e) => {
    return e !== true;
  });

  if (capacityCommitmentErrors.length > 0) {
    return capacityCommitmentErrors.join("\n\n");
  }

  return true;
}

function validateMissingComputePeers(config: {
  computePeers: Record<string, unknown>;
  offers: Record<string, { computePeers: Array<string> }>;
}): ValidationResult {
  const missingComputePeerNamesInOffer: Array<{
    offerName: string;
    missingComputePeerNames: Array<string>;
  }> = [];

  if (isEmpty(config.computePeers)) {
    return `There should be at least one computePeer defined in the config`;
  }

  const offers = Object.entries(config.offers);

  if (offers.length === 0) {
    return `There should be at least one offer defined in the config`;
  }

  // Checking that all computePeers referenced in offers are defined
  for (const [offerName, { computePeers }] of offers) {
    const missingComputePeerNames = computePeers.filter((cp) => {
      return !(cp in config.computePeers);
    });

    if (missingComputePeerNames.length > 0) {
      missingComputePeerNamesInOffer.push({
        offerName,
        missingComputePeerNames,
      });
    }
  }

  if (missingComputePeerNamesInOffer.length > 0) {
    return missingComputePeerNamesInOffer
      .map(({ offerName, missingComputePeerNames }) => {
        return `Offer ${color.yellow(
          offerName,
        )} has computePeers missing from the config's top level computePeers property: ${color.yellow(
          missingComputePeerNames.join(", "),
        )}`;
      })
      .join("\n");
  }

  return true;
}
