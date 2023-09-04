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

/* eslint-disable no-process-exit */

// eslint-disable-next-line import/extensions
import { ClientRequestInterceptor } from "@mswjs/interceptors/ClientRequest";
import { CLIError } from "@oclif/core/lib/errors/index.js";

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
 * @returns {never | Promise<void>}
 */
export const createErrorPromise = async (error) => {
  if (error instanceof CLIError) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${error.message}`);
  } else {
    // eslint-disable-next-line no-console
    console.error(error);
  }

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
 * @type {(value?: unknown) => void}
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
  "ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time",
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
      throw new Error(warning.stack);
    }

    const isWarnMsgToIgnore = WARN_MSGS_TO_IGNORE.some((msg) => {
      return (
        "stack" in warning &&
        typeof warning.stack === "string" &&
        warning.stack.includes(msg)
      );
    });

    if (!isWarnMsgToIgnore) {
      process.stderr.write(`Warning: ${String(warning)}\n`);
    }
  });
}
