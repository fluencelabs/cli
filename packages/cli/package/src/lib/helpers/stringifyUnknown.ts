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

import { AssertionError } from "assert";

import { CLIError } from "@oclif/core/errors";

import { jsonStringify } from "../../common.js";

/**
 * Used for error stringification cause one can throw anything in js (not only errors)
 * also used for e.g. debug logs or "unreachable error" messages where we don't necessarily care much about the output as long as it's somewhat readable.
 * it would be good to have two functions for this each with a more clear purpose for existence and used accordingly TODO: DXJ-763
 */

export function stringifyUnknown(unknown: unknown): string {
  try {
    if (typeof unknown === "string") {
      return unknown;
    }

    if (unknown instanceof CLIError || unknown instanceof AssertionError) {
      // eslint-disable-next-line no-restricted-syntax
      return String(unknown);
    }

    if (unknown instanceof Error) {
      const errorMessage =
        typeof unknown.stack === "string" &&
        unknown.stack.includes(unknown.message)
          ? unknown.stack
          : `${unknown.message}${unknown.stack === undefined ? "" : `\n${unknown.stack}`}`;

      const otherErrorProperties = Object.getOwnPropertyNames(unknown).filter(
        (p) => {
          return p !== "message" && p !== "stack";
        },
      );

      return `${errorMessage}${
        otherErrorProperties.length > 0
          ? `\n${JSON.stringify(unknown, otherErrorProperties, 2)}`
          : ""
      }`;
    }

    if (unknown === undefined) {
      return "undefined";
    }

    return jsonStringify(unknown);
  } catch {
    // eslint-disable-next-line no-restricted-syntax
    return String(unknown);
  }
}
