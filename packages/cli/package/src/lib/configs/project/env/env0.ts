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

import { FLUENCE_ENVS_OLD, type FluenceEnvOld } from "../../../const.js";
import type { ConfigOptions } from "../../initConfigNewTypes.js";

export type Config = {
  fluenceEnv?: FluenceEnvOld;
};

export default {
  schema: {
    type: "object",
    properties: {
      fluenceEnv: {
        title: "Fluence environment",
        description: "Fluence environment to connect to",
        type: "string",
        enum: [...FLUENCE_ENVS_OLD],
        nullable: true,
      },
    },
    additionalProperties: false,
  },
} as const satisfies ConfigOptions<undefined, Config>;
