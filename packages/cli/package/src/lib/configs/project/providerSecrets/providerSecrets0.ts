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

type SecretsConfig = {
  networkKey: string;
  signingWallet: string;
};

const secretesConfig = {
  type: "object",
  additionalProperties: false,
  description:
    "Secret keys for noxes. You can put it near provider config and populate it in CI",
  properties: {
    networkKey: {
      type: "string",
      description: "Network key for the nox",
    },
    signingWallet: {
      type: "string",
      format: "hex",
      description: "Signing wallet for built-in decider system service in nox",
    },
  },
  required: ["networkKey", "signingWallet"],
} as const satisfies JSONSchemaType<SecretsConfig>;

export type Config = {
  noxes: Record<string, SecretsConfig>;
};

export default {
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      noxes: {
        type: "object",
        description: "Secret keys for noxes by name",
        additionalProperties: secretesConfig,
        properties: { noxName: secretesConfig },
        required: [],
      },
    },
    required: ["noxes"],
  },
} as const satisfies ConfigOptions<undefined, Config>;
