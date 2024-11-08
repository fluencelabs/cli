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
  ensureProviderArtifactsConfigPath,
  getFluenceDir,
} from "../../../paths.js";
import { getConfigInitFunction } from "../../initConfigNew.js";
import { type InitConfigOptions } from "../../initConfigNewTypes.js";

import configOptions0, {
  type Config as Config0,
} from "./providerArtifacts0.js";
import configOptions1, {
  type Config as Config1,
} from "./providerArtifacts1.js";
import configOptions2, {
  type Config as Config2,
} from "./providerArtifacts2.js";
import configOptions3, {
  type Config as Config3,
} from "./providerArtifacts3.js";

export const options: InitConfigOptions<Config0, Config1, Config2, Config3> = {
  description: "Defines artifacts created by the provider",
  options: [configOptions0, configOptions1, configOptions2, configOptions3],
  getConfigPath: ensureProviderArtifactsConfigPath,
  getSchemaDirPath: getFluenceDir,
};

export const initNewProviderArtifactsConfig = getConfigInitFunction(
  options,
  () => {
    return { offers: {} };
  },
);

export const initProviderArtifactsConfig = getConfigInitFunction(options);
