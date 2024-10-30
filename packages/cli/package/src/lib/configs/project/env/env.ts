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

import { DEFAULT_PUBLIC_FLUENCE_ENV } from "../../../../common.js";
import { type FluenceEnv } from "../../../const.js";
import { getEnvConfigPath } from "../../../paths.js";
import { getConfigInitFunction } from "../../initConfigNew.js";
import { type InitConfigOptions } from "../../initConfigNewTypes.js";

import configOptions0, { type Config as Config0 } from "./env0.js";
import configOptions1, { type Config as Config1 } from "./env1.js";

export const options: InitConfigOptions<Config0, Config1> = {
  description: "Defines project user's preferences",
  options: [configOptions0, configOptions1],
  getConfigPath: getEnvConfigPath,
};

export function initNewEnvConfig(
  fluenceEnv: FluenceEnv = DEFAULT_PUBLIC_FLUENCE_ENV,
) {
  return getConfigInitFunction(options, () => {
    return { fluenceEnv };
  })();
}

export const initEnvConfig = getConfigInitFunction(options);
