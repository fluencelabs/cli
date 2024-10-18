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

import assert from "node:assert";

import { ClientRequestInterceptor } from "@mswjs/interceptors/ClientRequest";
import { color } from "@oclif/color";
import { CLIError } from "@oclif/core/errors";

const COUNTLY_REPORT_TIMEOUT = 3000;

/**
 * @type {() => Promise<boolean>}
 */
export const isCountlyInitialized = async () => {
  const Countly = await import("countly-sdk-nodejs");
  return Countly.device_id !== undefined;
};

/**
 * @type {() => never}
 */
const exitWithCode1 = () => {
  return process.exit(1);
};

let hasCrashed = false;
let hasSentCommandEvent = false;
let hasSessionEnded = false;

/**
 * @type {boolean | undefined}
 */
let isErrorExpected;

const ERROR_HANDLED_BY_OCLIF_KEY = "errorHandledByOclif";

/**
 * @param {Error | unknown} error
 * @returns {unknown}
 */
function formatError(error) {
  if (error instanceof CLIError) {
    // this errors are thrown by us using `commandObj.error` and are already readable and expected, so no additional coloring is needed
    return error.message;
  }

  if (error instanceof Error && typeof error.stack === "string") {
    // most unexpected errors are like this. error.stack also contains error message so we print it
    return color.red(error.stack);
  }

  if (typeof error === "object" && error !== null) {
    if (
      // Is AVM error
      "instruction" in error &&
      typeof error.instruction === "string" &&
      "message" in error &&
      typeof error.message === "string" &&
      "peer_id" in error &&
      typeof error.peer_id === "string"
    ) {
      let message = error.message;

      try {
        const regexpWithGroup = /(.*error message is )(.*)/g;

        message = error.message.replace(
          regexpWithGroup,
          (_, group1, group2) => {
            assert(typeof group1 === "string" && typeof group2 === "string");
            return `${group1}${group2
              .replace(/\\n/g, "\n")
              .replace(/\\"/g, '"')}`;
          },
        );
      } catch {}

      return color.red(
        `${message}\n\ninstruction: ${error.instruction}\npeer_id: ${error.peer_id}`,
      );
    }

    // some unexpected errors (e.g. avm) are just js objects - format and paint them red
    return color.red(jsonStringify(error));
  }

  if (typeof error === "string") {
    // some errors can be just strings - it's unexpected - paint them red
    return color.red(error);
  }

  // don't stringify/paint unknown stuff, let Node.js just display it
  return error;
}

/**
 * @param {Error | unknown} error
 * @returns {never | Promise<void>}
 */
export const createErrorPromise = async (error) => {
  // eslint-disable-next-line no-console
  console.error(color.red("Error:"), formatError(error));

  if (!(await isCountlyInitialized())) {
    return exitWithCode1();
  }

  const Countly = await import("countly-sdk-nodejs");

  if (error instanceof CLIError) {
    isErrorExpected = true;

    Countly.add_event({
      key: ERROR_HANDLED_BY_OCLIF_KEY,
      segmentation: { stack: error.stack },
    });
  } else {
    isErrorExpected = false;

    Countly.log_error(
      error instanceof Error
        ? JSON.stringify(error, Object.getOwnPropertyNames(error))
        : `Error: ${JSON.stringify(error)}`,
    );
  }

  return new Promise(() => {
    setTimeout(() => {
      // eslint-disable-next-line no-console
      console.log(
        `\nWasn't able to report this crash to Fluence Team. Please report it manually to https://github.com/fluencelabs/cli/issues`,
      );

      exitWithCode1();
    }, COUNTLY_REPORT_TIMEOUT);
  });
};

/**
 * @type {((value?: unknown) => void) | undefined}
 */
let resolveSessionEndPromise;
export const sessionEndPromise = new Promise((resolve) => {
  resolveSessionEndPromise = resolve;
});

const EVENTS_URL_PART = "/i?events=";

const interceptor = new ClientRequestInterceptor();
interceptor.apply();

interceptor.on("response", ({ request: { url } }) => {
  if (typeof url !== "string") {
    return;
  }

  if (
    isErrorExpected !== undefined && isErrorExpected
      ? url.includes(EVENTS_URL_PART) &&
        url.includes(ERROR_HANDLED_BY_OCLIF_KEY)
      : url.includes("/i?crash=")
  ) {
    hasCrashed = true;

    if (hasSentCommandEvent) {
      exitWithCode1();
    }
  }

  if (url.includes("/i?end_session=")) {
    hasSessionEnded = true;

    if (hasSentCommandEvent) {
      resolveSessionEndPromise?.();
    }
  }

  if (url.includes(EVENTS_URL_PART) && url.includes("command%3A")) {
    hasSentCommandEvent = true;

    if (hasCrashed) {
      exitWithCode1();
    }

    if (hasSessionEnded) {
      resolveSessionEndPromise?.();
    }
  }
});

const WARN_MSGS_TO_IGNORE = [
  "ExperimentalWarning: Import assertions are not a stable feature of the JavaScript language",
  "ExperimentalWarning: Importing JSON modules is an experimental feature",
  "DeprecationWarning: The `punycode` module is deprecated. Please use a userland alternative instead.",
];

/**
 * The main purpose of this function is to set up a listener for process warnings.
 * oclif reports this warnings when CLI command can not be interpreted by Node.js
 * (most of the time related to some imports dependencies missing)
 * This throws an error and enables us to see what the error is about
 * @returns {void}
 */
export function setUpProcessWarningListener() {
  process.on("warning", (warning) => {
    if (
      ("code" in warning && warning.code === "MODULE_NOT_FOUND") ||
      // when running in dev mode there is no warning.code
      // so we have to rely on the text of the error message
      (warning.stack ?? "").includes("Cannot find")
    ) {
      throw warning;
    }

    const isWarnMsgToIgnore = WARN_MSGS_TO_IGNORE.some((msg) => {
      return (
        "stack" in warning &&
        typeof warning.stack === "string" &&
        warning.stack.includes(msg)
      );
    });

    if (!isWarnMsgToIgnore) {
      process.stderr.write(`${JSON.stringify(warning, null, 2)}\n\n`);
    }
  });
}

/**
 * @param {unknown} unknown
 */
function jsonStringify(unknown) {
  return JSON.stringify(
    unknown,
    /**
     * @param {string} _key
     * @param {unknown} value
     */
    (_key, value) => {
      if (value instanceof Uint8Array) {
        return `Uint8Array<${JSON.stringify([...value])}>`;
      }

      if (typeof value === "bigint") {
        // eslint-disable-next-line no-restricted-syntax
        return value.toString();
      }

      return value;
    },
    2,
  );
}
