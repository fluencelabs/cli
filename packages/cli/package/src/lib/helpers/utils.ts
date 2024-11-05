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

import { AssertionError } from "node:assert";
import { access } from "node:fs/promises";

import { CLIError } from "@oclif/core/errors";

import { jsonStringify } from "../../common.js";

import { numToStr } from "./typesafeStringify.js";

export function commaSepStrToArr(commaSepStr: string) {
  return commaSepStr.split(",").map((s) => {
    return s.trim();
  });
}

function comment(commentToken: string) {
  return (text: string): string => {
    return text
      .split("\n")
      .map((line) => {
        return line === ""
          ? ""
          : line.replaceAll(/(^|\n)\s*/g, (spaces) => {
              return `${spaces}${commentToken} `;
            });
      })
      .join("\n");
  };
}

export const jsComment = comment("//");
export const aquaComment = comment("--");

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
          : `${unknown.message}${
              unknown.stack === undefined ? "" : `\n${unknown.stack}`
            }`;

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

function flagToArg(
  flagName: string,
  flagValue: string | number | boolean | undefined,
): string[] {
  if (flagValue === undefined || flagValue === false) {
    return [];
  }

  const flag = `-${flagName.length > 1 ? "-" : ""}${flagName}`;

  if (flagValue === true) {
    return [flag];
  }

  return [
    flag,
    typeof flagValue === "number" ? numToStr(flagValue) : flagValue,
  ];
}

export type Flags = Record<
  string,
  string | number | boolean | undefined | Array<string | undefined>
>;

export const flagsToArgs = (flags: Flags): string[] => {
  return Object.entries(flags)
    .map(([flagName, flagValue]): Array<string[]> => {
      return Array.isArray(flagValue)
        ? flagValue.map((value): string[] => {
            return flagToArg(flagName, value);
          })
        : [flagToArg(flagName, flagValue)];
    })
    .flat(2);
};

export function removeProperties<T>(
  obj: Record<string, T>,
  isPropertyToRemove: (arg: [key: string, value: unknown]) => boolean,
): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([key, value]) => {
      return !isPropertyToRemove([key, value]);
    }),
  );
}

export const LOGS_RESOLVE_SUBNET_ERROR_START = `Failed to resolve subnet:`;
export const LOGS_GET_ERROR_START = `Failed to get logs:`;

export function splitErrorsAndResults<T, U, V>(
  array: Array<T>,
  splitter: (
    v: T,
    i: number,
  ) => { error: NonNullable<U> } | { result: NonNullable<V> },
): [NonNullable<U>[], NonNullable<V>[]] {
  const errors: Array<NonNullable<U>> = [];
  const results: Array<NonNullable<V>> = [];

  for (const [i, item] of Object.entries(array)) {
    const splitted = splitter(item, Number(i));

    if ("error" in splitted) {
      errors.push(splitted.error);
    } else {
      results.push(splitted.result);
    }
  }

  return [errors, results];
}

export async function pathExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
