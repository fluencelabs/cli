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

import { access } from "node:fs/promises";

import { numToStr } from "./typesafeStringify.js";

export function commaSepStrToArr(commaSepStr: string) {
  return commaSepStr
    .split(",")
    .map((s) => {
      return s.trim();
    })
    .filter((s) => {
      return s !== "";
    });
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
