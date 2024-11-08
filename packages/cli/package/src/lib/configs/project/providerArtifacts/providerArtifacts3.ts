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

import {
  fluenceOldEnvToNewEnv,
  isFluenceEnvOld,
  PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME,
  type FluenceEnv,
} from "../../../const.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import {
  offersConfig,
  type OffersConfig,
  type Config as PrevConfig,
} from "./providerArtifacts2.js";

type Offers = Partial<Record<FluenceEnv, OffersConfig>>;
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
          testnet: offersConfig,
          custom: offersConfig,
          mainnet: offersConfig,
          local: offersConfig,
          stage: offersConfig,
        },
        required: [],
      },
    },
    required: ["offers"],
  },
  migrate(config) {
    const newConfig: Config = { offers: {} };

    for (const [env, configPerEnv] of Object.entries(config.offers)) {
      if (Object.keys(configPerEnv).length === 0) {
        continue;
      }

      if (!isFluenceEnvOld(env)) {
        throw new Error(
          `Unreachable. Migration error. Unknown env ${env} in ${PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME}`,
        );
      }

      newConfig.offers[fluenceOldEnvToNewEnv(env)] = configPerEnv;
    }

    return newConfig;
  },
} as const satisfies ConfigOptions<PrevConfig, Config>;
