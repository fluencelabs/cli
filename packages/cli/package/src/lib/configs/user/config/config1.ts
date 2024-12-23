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

import { commandObj } from "../../../commandObj.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

import type { Config as PrevConfig } from "./config0.js";

export type Config = {
  countlyConsent: boolean;
  defaultSecretKeyName?: string;
  docsInConfigs?: boolean;
};

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      countlyConsent: {
        type: "boolean",
        description: "Weather you consent to send usage data to Countly",
      },
      defaultSecretKeyName: {
        type: "string",
        description:
          "DEPRECATED: Secret key with this name will be used by default by js-client inside CLI to run Aqua code",
        nullable: true,
      },
      docsInConfigs: {
        type: "boolean",
        description: "DEPRECATED: Whether to include docs in generated configs",
        nullable: true,
      },
    },
    required: ["countlyConsent"],
  },
  migrate({ lastCheckForUpdates, ...config }) {
    if (lastCheckForUpdates !== undefined) {
      commandObj.log(
        `Use of 'lastCheckForUpdates' field is deprecated. It's currently advised to install CLI without using npm`,
      );
    }

    return config;
  },
} as const satisfies ConfigOptions<PrevConfig, Config>;
