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

import { color } from "@oclif/color";

import { commandObj } from "../commandObj.js";
import { dbg } from "../dbg.js";

import { numToStr } from "./typesafeStringify.js";
import { stringifyUnknown } from "./utils.js";

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

      if (attemptCounter > 1) {
        commandObj.logToStderr(
          `Succeeded to ${yellowMessage} after ${numToStr(attemptCounter)} attempts`,
        );
      }

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
