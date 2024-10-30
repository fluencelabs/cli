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

import type { JSONSchemaType } from "ajv";
import { mapValues } from "lodash-es";

import { versions } from "../../../../versions.js";
import { PT_SYMBOL } from "../../../const.js";
import { numToStr } from "../../../helpers/typesafeStringify.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import {
  type CapacityCommitments,
  capacityCommitmentsSchema,
  providerNameSchema,
} from "./provider0.js";
import {
  ccpConfigYAMLSchema,
  computePeersSchema,
  noxConfigYAMLSchema,
  type CCPConfigYAML,
  type ComputePeers,
  type NoxConfigYAML,
  type Config as PrevConfig,
} from "./provider1.js";

export type Offer = {
  minPricePerCuPerEpoch: string;
  computePeers: Array<string>;
  effectors?: Array<string>;
  minProtocolVersion?: number;
  maxProtocolVersion?: number;
};

const offerSchema = {
  type: "object",
  description: "Defines a provider offer",
  additionalProperties: false,
  properties: {
    minPricePerCuPerEpoch: {
      type: "string",
      description: `Minimum price per compute unit per epoch in ${PT_SYMBOL}`,
    },
    computePeers: {
      description: "Number of Compute Units for this Compute Peer",
      type: "array",
      items: { type: "string" },
      uniqueItems: true,
    },
    effectors: { type: "array", items: { type: "string" }, nullable: true },
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
  required: ["minPricePerCuPerEpoch", "computePeers"],
} as const satisfies JSONSchemaType<Offer>;

export type Offers = Record<string, Offer>;

export const offersSchema = {
  description: "A map with offer names as keys and offers as values",
  type: "object",
  additionalProperties: offerSchema,
  properties: { Offer: offerSchema },
  required: [],
} as const satisfies JSONSchemaType<Offers>;

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
  migrate({ offers, ...restConfig }) {
    return {
      ...restConfig,
      offers: mapValues(offers, ({ minPricePerWorkerEpoch, ...restConfig }) => {
        return {
          ...restConfig,
          minPricePerCuPerEpoch: minPricePerWorkerEpoch,
        };
      }),
    };
  },
} satisfies ConfigOptions<PrevConfig, Config>;
