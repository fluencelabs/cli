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

/* eslint-disable camelcase */

import {
  sessionEndPromise,
  isCountlyInitialized,
} from "../errorInterceptor.js";

import { commandObj } from "./commandObj.js";
import { userConfig } from "./configs/globalConfigs.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { IS_DEVELOPMENT } from "./const.js";
import { ensureDir, getUserCountlyDir } from "./paths.js";

type InitCountlyArgs = {
  maybeFluenceConfig: FluenceConfig | null;
};

export async function initCountly({
  maybeFluenceConfig,
}: InitCountlyArgs): Promise<void> {
  const userCountlyDir = await getUserCountlyDir();

  if (!IS_DEVELOPMENT && userConfig.countlyConsent) {
    const Countly = (await import("countly-sdk-nodejs")).default;

    Countly.init({
      app_key: "728984bc3e1aee7dd29674ee300530750b5630d8",
      url: "https://countly.fluence.dev/",
      debug: process.env.DEBUG_COUNTLY === "true",
      storage_path: await ensureDir(userCountlyDir),
      app_version: commandObj.config.version,
    });

    Countly.begin_session();

    Countly.add_event({
      key: `command:${commandObj.id ?? "unknown"}`,
      segmentation: {
        userAgent: commandObj.config.userAgent,
        platform: commandObj.config.platform,
        ...dependenciesToSegmentation(
          maybeFluenceConfig?.dependencies?.npm,
          "npm",
        ),
        ...dependenciesToSegmentation(
          maybeFluenceConfig?.dependencies?.cargo,
          "cargo",
        ),
      },
    });
  }
}

const dependenciesToSegmentation = (
  dependencies: Record<string, string> | null | undefined,
  prefix: string,
): Record<string, string> => {
  return Object.entries(dependencies ?? {}).reduce((acc, [dep, version]) => {
    return {
      ...acc,
      [`[${prefix}]${dep}`]: version,
    };
  }, {});
};

/**
 * Add log that will be sent to Countly together with crash report
 * @param message - message to be logged
 * @returns void
 */
export const addCountlyLog = async (message: string): Promise<void> => {
  if (!(await isCountlyInitialized())) {
    return;
  }

  const Countly = (await import("countly-sdk-nodejs")).default;
  Countly.add_log(message);
};

/**
 * Add error log
 * @param message - message to be logged
 * @returns void
 */
export const logErrorToCountly = async (message: string): Promise<void> => {
  if (!(await isCountlyInitialized())) {
    return;
  }

  const Countly = (await import("countly-sdk-nodejs")).default;
  Countly.log_error(message);
};

export const addCountlyEvent = async (key: string): Promise<void> => {
  if (!(await isCountlyInitialized())) {
    return;
  }

  const Countly = (await import("countly-sdk-nodejs")).default;

  Countly.add_event({ key });
};

export const haltCountly = async (): Promise<void> => {
  if (!(await isCountlyInitialized())) {
    return;
  }

  const Countly = (await import("countly-sdk-nodejs")).default;
  Countly.end_session();
  await sessionEndPromise;
};
