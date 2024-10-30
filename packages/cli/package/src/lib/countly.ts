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

import {
  sessionEndPromise,
  isCountlyInitialized,
} from "../errorInterceptor.js";

import { commandObj } from "./commandObj.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { initNewUserConfig } from "./configs/user/config/config.js";
import { IS_DEVELOPMENT } from "./const.js";
import { ensureDir, getUserCountlyDir } from "./paths.js";

type InitCountlyArgs = {
  maybeFluenceConfig: FluenceConfig | null;
};

export async function initCountly({
  maybeFluenceConfig,
}: InitCountlyArgs): Promise<void> {
  const userCountlyDir = await getUserCountlyDir();
  const userConfig = await initNewUserConfig();

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
          maybeFluenceConfig?.aquaDependencies,
          "aqua",
        ),
        ...dependenciesToSegmentation(
          maybeFluenceConfig?.marineVersion === undefined
            ? {}
            : {
                marine: maybeFluenceConfig.marineVersion,
              },
          "marine",
        ),
        ...dependenciesToSegmentation(
          maybeFluenceConfig?.mreplVersion === undefined
            ? {}
            : {
                mrepl: maybeFluenceConfig.mreplVersion,
              },
          "mrepl",
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
