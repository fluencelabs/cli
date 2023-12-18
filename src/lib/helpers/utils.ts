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

export function jsonStringify(
  unknown: unknown,
  replacer: Parameters<typeof JSON.stringify>[1] = null,
): string {
  return JSON.stringify(unknown, replacer, 2);
}

export function stringifyUnknown(unknown: unknown): string {
  try {
    if (unknown instanceof CLIError) {
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
          ? `\n${jsonStringify(unknown, otherErrorProperties)}`
          : ""
      }`;
    }

    if (unknown === undefined) {
      return "undefined";
    }

    return jsonStringify(unknown);
  } catch {
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

  return [flag, String(flagValue)];
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
  splitter: (v: T) => { error: NonNullable<U> } | { result: NonNullable<V> },
) {
  const errors: Array<NonNullable<U>> = [];
  const results: Array<NonNullable<V>> = [];

  for (const item of array) {
    const splitted = splitter(item);

    if ("error" in splitted) {
      errors.push(splitted.error);
    } else {
      results.push(splitted.result);
    }
  }

  return [errors, results] as const;
}

export async function setTryTimeout<T, U>(
  callbackToTry: () => T | Promise<T>,
  errorHandler: (error: unknown) => U,
  msToTryFor: number,
  msBetweenTries = 1000,
): Promise<T | U> {
  let isTimeoutRunning = true;

  const timeout = setTimeout(() => {
    isTimeoutRunning = false;
  }, msToTryFor);

  let error: unknown;
  let isTrying = true;

  while (isTrying) {
    isTrying = isTimeoutRunning;

    try {
      const res = await callbackToTry();
      clearTimeout(timeout);
      isTrying = false;
      return res;
    } catch (e) {
      error = e;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, msBetweenTries);
    });
  }

  return errorHandler(error);
}
