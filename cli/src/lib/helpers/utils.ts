/**
 * Copyright 2024 Fluence DAO
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

import { AssertionError } from "node:assert";

import { color } from "@oclif/color";
import { CLIError } from "@oclif/core/lib/errors/index.js";

import { jsonStringify } from "../../common.js";
import { commandObj } from "../commandObj.js";
import { dbg } from "../dbg.js";

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
) {
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

  return [errors, results] as const;
}

export async function setTryTimeout<T, U>(
  message: string,
  callbackToTry: () => T | Promise<T>,
  errorHandler: (error: unknown) => U,
  msToTryFor: number,
  msBetweenTries = 1000,
  failCondition?: (error: unknown) => boolean,
): Promise<T | U> {
  const yellowMessage = color.yellow(message);
  let isTimeoutRunning = true;

  const timeout = setTimeout(() => {
    isTimeoutRunning = false;
  }, msToTryFor);

  let error: unknown;
  let attemptCounter = 1;
  let isTrying = true;

  while (isTrying) {
    isTrying = isTimeoutRunning;

    try {
      dbg(`Trying to ${yellowMessage}`);
      const res = await callbackToTry();
      clearTimeout(timeout);
      isTrying = false;
      return res;
    } catch (e) {
      if (failCondition !== undefined && failCondition(e)) {
        clearTimeout(timeout);
        return errorHandler(e);
      }

      const errorString = stringifyUnknown(e);
      const previousErrorString = stringifyUnknown(error);

      if (errorString === previousErrorString) {
        commandObj.logToStderr(
          `Attempt #${numToStr(
            attemptCounter,
          )} to ${yellowMessage} failed with the same error`,
        );
      } else {
        const retryMessage = isTrying ? ". Going to retry" : "";
        commandObj.logToStderr(`Failing to ${yellowMessage}${retryMessage}`);
        dbg(`Reason: ${stringifyUnknown(e)}`);
      }

      error = e;
      attemptCounter++;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, msBetweenTries);
    });
  }

  return errorHandler(error);
}
