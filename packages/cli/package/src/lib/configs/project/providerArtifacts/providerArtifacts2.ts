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

import {
  isFluenceEnvOld,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  type FluenceEnvOld,
} from "../../../const.js";
import { input } from "../../../prompt.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import type { Config as PrevConfig } from "./providerArtifacts1.js";

type OfferConfig = { id: string; providerAddress: string };

const offerConfig = {
  type: "object",
  additionalProperties: false,
  properties: {
    id: { type: "string", description: "Offer id" },
    providerAddress: {
      type: "string",
      description: "Provider address",
    },
  },
  required: ["id", "providerAddress"],
} as const satisfies JSONSchemaType<OfferConfig>;

export type OffersConfig = Record<string, OfferConfig>;

export const offersConfig = {
  type: "object",
  description: "Created offers",
  additionalProperties: offerConfig,
  properties: { offerName: offerConfig },
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
    const newConfig: Config = { offers: {} };

    for (const [env, configPerEnv] of Object.entries(config.offers)) {
      if (!isFluenceEnvOld(env)) {
        throw new Error(
          `Unreachable. Migration error. Unknown env ${env} in ${PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME}`,
        );
      }

      const newConfigPerEnv: OffersConfig = {};

      for (const [offerName, offer] of Object.entries(configPerEnv)) {
        const providerAddress = await input({
          message: `Enter provider wallet address that you previously used when creating offer ${offerName} with offerId: ${offer.id}`,
        });

        newConfigPerEnv[offerName] = { ...offer, providerAddress };
      }

      newConfig.offers[env] = newConfigPerEnv;
    }

    return newConfig;
  },
} as const satisfies ConfigOptions<PrevConfig, Config>;
