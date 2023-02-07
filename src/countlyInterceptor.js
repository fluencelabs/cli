/**
 * Copyright 2022 Fluence Labs Limited
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

import { ClientRequestInterceptor } from "@mswjs/interceptors/lib/interceptors/ClientRequest/index.js";
import Countly from "countly-sdk-nodejs";

const COUNTLY_REPORT_TIMEOUT = 3000;

/**
 * @type {() => boolean}
 */
export const isCountlyInited = () => Countly.device_id !== undefined;

/**
 * @type {() => void}
 */
let resolveErrorPromise;
let hasCrashed = false;
let hasSentCommandEvent = false;
let hasSessionEnded = false;

/**
 * @type {boolean | undefined}
 */
let isErrorExpected;

/**
 * some of the errors (e.g. invalid user input) are expected and
 * should not be reported to Countly as crashes
 * @param {unknown} unknown
 * @returns {unknown is Error}
 */
const getIsErrorExpected = (unknown) =>
  typeof unknown === "object" && unknown !== null && "oclif" in unknown;

const ERROR_HANDLED_BY_OCLIF_KEY = "errorHandledByOclif";

/**
 * @param {unknown} error
 * @param {(unknown: unknown) => unknown} errorHandler
 * @returns
 */
export const createErrorPromise = (error, errorHandler) => {
  isErrorExpected = getIsErrorExpected(error);

  if (!isCountlyInited()) {
    return errorHandler(error);
  }

  if (getIsErrorExpected(error)) {
    Countly.add_event({
      key: ERROR_HANDLED_BY_OCLIF_KEY,
      segmentation: { error: error.message, stack: error.stack ?? "" },
    });
  } else {
    Countly.log_error(String(error));
  }

  return new Promise((resolve) => {
    resolveErrorPromise = () => resolve(errorHandler(error));

    setTimeout(() => {
      console.log(
        "Wasn't able to report this crash to Fluence Team. Please report it manually to https://github.com/fluencelabs/fluence-cli/issues\n"
      );

      resolveErrorPromise();
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
      resolveErrorPromise?.();
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
      resolveErrorPromise?.();
    }

    if (hasSessionEnded) {
      resolveSessionEndPromise?.();
    }
  }
});
