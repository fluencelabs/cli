const {
  ClientRequestInterceptor,
} = require("@mswjs/interceptors/lib/interceptors/ClientRequest");
const Countly = require("countly-sdk-nodejs");

/**
 * @type {() => void}
 */
let resolveErrorPromise;
let hasCrashed = false;
let hasSentCommandEvent = false;
let hasSessionEnded = false;

/**
 * @param {unknown} error
 * @param {(unknown: unknown) => unknown} errorHandler
 * @returns
 */
const createErrorPromise = (error, errorHandler) => {
  if (Countly.device_id === undefined) {
    return errorHandler(error);
  }

  Countly.log_error(error);

  return new Promise((resolve) => {
    resolveErrorPromise = () => resolve(errorHandler(error));
  });
};

/**
 * @type {(value?: unknown) => void}
 */
let resolveSessionEndPromise;
const sessionEndPromise = new Promise((resolve) => {
  resolveSessionEndPromise = resolve;
});

const interceptor = new ClientRequestInterceptor();
interceptor.apply();
interceptor.on("response", (_response, request) => {
  if (request.url.includes("/i?crash=")) {
    hasCrashed = true;
    if (hasSentCommandEvent) {
      resolveErrorPromise?.();
    }
    return;
  }

  if (request.url.includes("/i?end_session=")) {
    hasSessionEnded = true;
    if (hasSentCommandEvent) {
      resolveSessionEndPromise?.();
    }
    return;
  }

  if (
    request.url.includes("/i?events=") &&
    request.url.includes("command%3A")
  ) {
    hasSentCommandEvent = true;
    if (hasCrashed) {
      resolveErrorPromise?.();
    }
    if (hasSessionEnded) {
      resolveSessionEndPromise?.();
    }
    return;
  }
});

module.exports = { createErrorPromise, sessionEndPromise };
