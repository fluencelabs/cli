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

import { color } from "@oclif/color";

import { commandObj, isInteractive } from "../../../commandObj.js";
import { CLI_NAME_FULL, AUTO_GENERATED } from "../../../const.js";
import { getUserConfigPath } from "../../../paths.js";
import { confirm } from "../../../prompt.js";
import { getConfigInitFunction } from "../../initConfigNew.js";
import { type InitConfigOptions } from "../../initConfigNewTypes.js";

import configOptions0, { type Config as Config0 } from "./config0.js";
import configOptions1, { type Config as Config1 } from "./config1.js";

export const options: InitConfigOptions<Config0, Config1> = {
  description: `Defines global config for ${CLI_NAME_FULL}`,
  options: [configOptions0, configOptions1],
  getConfigPath: getUserConfigPath,
};

export async function initNewUserConfig() {
  const userConfig = await getConfigInitFunction(options, async () => {
    let countlyConsent = false;

    if (
      isInteractive &&
      (await confirm({
        message: `Help me improve ${CLI_NAME_FULL} by sending anonymous usage data. I don't collect IDs, names, or other personal data.\n${color.gray(
          "Metrics will help the developers know which features are useful so they can prioritize what to work on next. Cloudless Labs hosts a Countly instance to record anonymous usage data.",
        )}\nOK?`,
      }))
    ) {
      countlyConsent = true;

      commandObj.logToStderr(
        `If you change your mind later, modify "countlyConsent" property in ${await options.getConfigPath()}`,
      );
    }

    return { countlyConsent, defaultSecretKeyName: AUTO_GENERATED };
  })();

  return userConfig;
}
