/**
 * Copyright 2023 Fluence Labs Limited
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import snakeCase from "lodash-es/snakeCase.js";

import versionsJSON from "./versions.json" assert { type: "json" };

// Don't know how to do this transformation without type assertion.
// It is pretty simple so it is safe
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
export const versions = override(versionsJSON, "FCLI_V") as typeof versionsJSON;

interface RecToOverride extends Record<string, string | RecToOverride> {}

/**
 * Override versions using env variables
 * @param rec Record to override
 * @param prefix Prefix for env variables
 * @returns Overridden record
 */
function override(rec: RecToOverride, prefix: string): RecToOverride {
  return Object.fromEntries<string | RecToOverride>(
    Object.entries(rec).map(([name, version]) => {
      const envVarName = `${prefix}_${snakeCase(name).toUpperCase()}`;

      if (typeof version === "string") {
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
