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

import type { FluenceEnvOld } from "../../../const.js";
import { fluenceEnvOldPrompt } from "../../../resolveFluenceEnv.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import {
  type Config as PrevConfig,
  type OfferConfig,
  offerConfig,
} from "./providerArtifacts0.js";

type OffersConfig = Record<string, OfferConfig>;

const offersConfig = {
  type: "object",
  description: "Created offers",
  additionalProperties: offerConfig,
  properties: { noxName: offerConfig },
  required: [],
  nullable: true,
} as const satisfies JSONSchemaType<OffersConfig>;

type Offers = Partial<Record<FluenceEnvOld, OffersConfig>>;
export type Config = { offers: Offers };

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      offers: {
        type: "object",
        description: "Created offers",
        additionalProperties: false,
        properties: {
          dar: offersConfig,
          custom: offersConfig,
          kras: offersConfig,
          local: offersConfig,
          stage: offersConfig,
        },
        required: [],
      },
    },
    required: ["offers"],
  },
  async migrate(config) {
    const offers: Offers = {};

    for (const [offerName, offer] of Object.entries(config.offers)) {
      const env = await fluenceEnvOldPrompt(
        `Select the environment that you previously used for creating offer ${offerName} with offerId: ${offer.id}`,
      );

      const dealsForEnv = offers[env] ?? {};
      dealsForEnv[offerName] = offer;
      offers[env] = dealsForEnv;
    }

    return { offers };
  },
} as const satisfies ConfigOptions<PrevConfig, Config>;
