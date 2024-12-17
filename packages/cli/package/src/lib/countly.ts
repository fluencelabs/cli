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
import { initNewUserConfig } from "./configs/user/config/config.js";
import { IS_DEVELOPMENT } from "./const.js";
import { ensureDir, getUserCountlyDir } from "./paths.js";

export async function initCountly(): Promise<void> {
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
      },
    });
  }
}

export const haltCountly = async (): Promise<void> => {
  if (!(await isCountlyInitialized())) {
    return;
  }

  const Countly = (await import("countly-sdk-nodejs")).default;
  Countly.end_session();
  await sessionEndPromise;
};
