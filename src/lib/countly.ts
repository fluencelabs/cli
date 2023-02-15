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

/* eslint-disable camelcase */

import Countly from "countly-sdk-nodejs";

import { sessionEndPromise, isCountlyInited } from "../countlyInterceptor.js";

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import type { UserConfig } from "./configs/user/config.js";
import { IS_DEVELOPMENT } from "./const.js";
import { ensureDir, getUserCountlyDir } from "./paths.js";

type InitCountlyArgs = {
  userConfig: UserConfig;
  maybeFluenceConfig: FluenceConfig | null;
};

export async function initCountly({
  userConfig,
  maybeFluenceConfig,
}: InitCountlyArgs): Promise<void> {
  const userCountlyDir = await getUserCountlyDir();

  if (!IS_DEVELOPMENT && userConfig.countlyConsent) {
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
          "npm"
        ),
        ...dependenciesToSegmentation(
          maybeFluenceConfig?.dependencies?.cargo,
          "cargo"
        ),
      },
    });
  }
}

const dependenciesToSegmentation = (
  dependencies: Record<string, string> | null | undefined,
  prefix: string
): Record<string, string> =>
  Object.entries(dependencies ?? {}).reduce(
    (acc, [dep, version]) => ({
      ...acc,
      [`[${prefix}]${dep}`]: version,
    }),
    {}
  );

/**
 * Add log that will be sent to Countly together with crash report
 * @param message - message to be logged
 * @returns void
 */
export const addCountlyLog = (message: string): void => {
  if (!isCountlyInited()) {
    return;
  }

  Countly.add_log(message);
};

export const haltCountly = async (): Promise<void> => {
  if (!isCountlyInited()) {
    return;
  }

  Countly.end_session();
  await sessionEndPromise;
};
