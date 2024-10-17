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

import type { EnvConfig } from "./project/env.js";
import type { UserConfig } from "./user/config.js";

export let userConfig: UserConfig;

export function setUserConfig(newUserConfig: UserConfig) {
  userConfig = newUserConfig;
}

export let envConfig: EnvConfig | null = null;

export function setEnvConfig(newEnvConfig: EnvConfig) {
  envConfig = newEnvConfig;
}
