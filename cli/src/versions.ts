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

import snakeCase from "lodash-es/snakeCase.js";

import versionsJSON from "./versions.json" assert { type: "json" };

// Don't know how to do this transformation without type assertion.
// It is pretty simple so it is safe
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const versions = override(versionsJSON, "FCLI_V") as typeof versionsJSON;

type AllowedValues = string | number | boolean;

interface RecToOverride extends Record<string, AllowedValues | RecToOverride> {}

/**
 * Override versions using env variables
 * @param rec Record to override
 * @param prefix Prefix for env variables
 * @returns Overridden record
 */
function override(rec: RecToOverride, prefix: string): RecToOverride {
  return Object.fromEntries<AllowedValues | RecToOverride>(
    Object.entries(rec).map(([name, version]) => {
      const envVarName = `${prefix}_${snakeCase(name).toUpperCase()}`;

      if (typeof version !== "object") {
        const versionFromEnv = process.env[envVarName];

        const overriddenVersion =
          versionFromEnv === undefined || versionFromEnv === ""
            ? version
            : versionFromEnv;

        return [name, overriddenVersion];
      }

      return [name, override(version, envVarName)];
    }),
  );
}
