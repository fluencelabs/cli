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

import { CHAIN_ENV } from "../common.js";

import { type FluenceEnv, ENV_FLAG_NAME } from "./const.js";
import { list } from "./prompt.js";

export async function fluenceEnvPrompt(
  message = "Select Fluence Environment to use",
  defaultVal: FluenceEnv = process.env.FLUENCE_ENV,
): Promise<FluenceEnv> {
  return list({
    message,
    options: [...CHAIN_ENV],
    oneChoiceMessage() {
      throw new Error("Unreachable. There are multiple envs");
    },
    onNoChoices() {
      throw new Error("Unreachable. There are multiple envs");
    },
    default: defaultVal,
    flagName: ENV_FLAG_NAME,
  });
}
