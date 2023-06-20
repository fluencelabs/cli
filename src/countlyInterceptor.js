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

import { ClientRequestInterceptor } from "@mswjs/interceptors/lib/interceptors/ClientRequest/index.js";
import { CLIError } from "@oclif/core/lib/errors/index.js";
import Countly from "countly-sdk-nodejs";

const COUNTLY_REPORT_TIMEOUT = 3000;

/**
 * @type {() => boolean}
 */
export const isCountlyInitialized = () => {
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
export const createErrorPromise = (error) => {
  if (error instanceof CLIError) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error(error);
  }

  if (!isCountlyInitialized()) {
    return exitWithCode1();
  }

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
        : `Error: ${JSON.stringify(error)}`
    );
  }

  return new Promise(() => {
    setTimeout(() => {
      console.log(
        `\nWasn't able to report this crash to Fluence Team. Please report it manually to https://github.com/fluencelabs/flox/issues`
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

interceptor.on("response", (_response, { url }) => {
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
