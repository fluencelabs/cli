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

import { commandObj } from "./commandObj.js";
import { ENV_FLAG_NAME, PRIV_KEY_FLAG_NAME } from "./const.js";

export type ChainFlags = {
  [ENV_FLAG_NAME]?: string | undefined;
  [PRIV_KEY_FLAG_NAME]?: string | undefined;
};

export let chainFlags: ChainFlags = {};

export function setChainFlags(flags: ChainFlags) {
  let env = flags[ENV_FLAG_NAME];

  if (env === "kras") {
    commandObj.warn(`'kras' is deprecated, use 'mainnet' instead`);
    env = "mainnet";
  } else if (env === "dar") {
    commandObj.warn(`'dar' is deprecated, use 'testnet' instead`);
    env = "testnet";
  }

  chainFlags = {
    ...flags,
    ...(env === undefined ? {} : { [ENV_FLAG_NAME]: env }),
  };
}
