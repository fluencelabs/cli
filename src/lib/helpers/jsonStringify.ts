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

import { CLIError } from "@oclif/core/lib/errors/index.js";

export const jsonStringify = (
  unknown: unknown,
  replacer: Parameters<typeof JSON.stringify>[1] = null
): string => {
  return JSON.stringify(unknown, replacer, 2);
};

export const stringifyUnknown = (unknown: unknown): string => {
  try {
    if (unknown instanceof CLIError) {
      return String(unknown);
    }

    if (unknown instanceof Error) {
      return jsonStringify(unknown, Object.getOwnPropertyNames(unknown));
    }

    if (unknown === undefined) {
      return "undefined";
    }

    return jsonStringify(unknown);
  } catch {
    return String(unknown);
  }
};
