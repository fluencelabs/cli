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
  DEBUG_COUNTLY,
  FLUENCE_ENV,
  FLUENCE_USER_DIR,
  CI,
} from "../src/lib/setupEnvironment.js";

import { ChainENV } from "./common.js";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      [FLUENCE_ENV]: ChainENV;
      [DEBUG_COUNTLY]: "true" | "false";
      [FLUENCE_USER_DIR]?: string;
      [CI]: "true" | "false";
      PATH: string;
    }
  }
}
