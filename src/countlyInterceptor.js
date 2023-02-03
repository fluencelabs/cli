import { ClientRequestInterceptor } from "@mswjs/interceptors/lib/interceptors/ClientRequest/index.js";
import Countly from "countly-sdk-nodejs";

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
      segmentation: { error: error.message, stack: error.stack || "" },
    });
  } else {
    Countly.log_error(error);
  }

  return new Promise((resolve) => {
    resolveErrorPromise = () => resolve(errorHandler(error));
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
interceptor.on("response", (_response, request) => {
  if (
    isErrorExpected !== undefined && isErrorExpected
      ? request.url.includes(EVENTS_URL_PART) &&
        request.url.includes(ERROR_HANDLED_BY_OCLIF_KEY)
      : request.url.includes("/i?crash=")
  ) {
    hasCrashed = true;
    if (hasSentCommandEvent) {
      resolveErrorPromise?.();
    }
  }

  if (request.url.includes("/i?end_session=")) {
    hasSessionEnded = true;
    if (hasSentCommandEvent) {
      resolveSessionEndPromise?.();
    }
  }

  if (
    request.url.includes(EVENTS_URL_PART) &&
    request.url.includes("command%3A")
  ) {
    hasSentCommandEvent = true;
    if (hasCrashed) {
      resolveErrorPromise?.();
    }
    if (hasSessionEnded) {
      resolveSessionEndPromise?.();
    }
  }
});
