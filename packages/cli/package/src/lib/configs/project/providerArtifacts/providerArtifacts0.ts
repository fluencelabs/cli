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

import type { ConfigOptions } from "../../initConfigNewTypes.js";

export type OfferConfig = { id: string };

export const offerConfig = {
  type: "object",
  additionalProperties: false,
  description: "Created offer info",
  properties: { id: { type: "string", description: "Offer id" } },
  required: ["id"],
} as const satisfies JSONSchemaType<OfferConfig>;

type Offers = Record<string, OfferConfig>;
export type Config = { offers: Offers };

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      offers: {
        type: "object",
        description: "Created offers",
        additionalProperties: offerConfig,
        properties: {
          noxName: offerConfig,
        },
        required: [],
      },
    },
    required: ["offers"],
  },
} as const satisfies ConfigOptions<undefined, Config>;
