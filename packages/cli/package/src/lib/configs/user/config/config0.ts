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

import { CLI_NAME_FULL } from "../../../const.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

export type Config = {
  countlyConsent: boolean;
  lastCheckForUpdates?: string;
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
      lastCheckForUpdates: {
        type: "string",
        description: `DEPRECATED. It's currently advised to install CLI without using npm (See README.md: https://github.com/fluencelabs/cli?tab=readme-ov-file#installation-and-usage). Last time when ${CLI_NAME_FULL} checked for updates. Updates are checked daily unless this field is set to 'disabled'`,
        nullable: true,
      },
    },
    required: ["countlyConsent"],
  },
} as const satisfies ConfigOptions<undefined, Config>;
