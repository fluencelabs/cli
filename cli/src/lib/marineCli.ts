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

import { join } from "node:path";

import { commandObj } from "./commandObj.js";
import { BIN_DIR_NAME, MARINE_CARGO_DEPENDENCY } from "./const.js";
import { execPromise } from "./execPromise.js";
import { ensureMarineOrMreplDependency } from "./rust.js";
import { type Flags } from "./typeHelpers.js";

type MarineCliInput =
  | {
      args: ["aqua"] | ["aqua", string];
      flags?: Flags<"id" | "service">;
    }
  | {
      args: ["build", ...string[]];
      flags?: Flags<"release">;
    };

export type MarineCLI = {
  (
    args: {
      message?: string | undefined;
      cwd?: string;
      printOutput?: boolean;
    } & MarineCliInput,
  ): Promise<string>;
};

export async function initMarineCli(): Promise<MarineCLI> {
  const marineCLIDirPath = await ensureMarineOrMreplDependency({
    name: MARINE_CARGO_DEPENDENCY,
  });

  const marineCLIPath = join(marineCLIDirPath, BIN_DIR_NAME, "marine");

  return async ({
    args,
    flags,
    message,
    cwd,
    printOutput = true,
  }): Promise<string> => {
    try {
      return await execPromise({
        command: marineCLIPath,
        args,
        flags,
        spinnerMessage: message,
        options: { cwd },
        printOutput,
      });
    } catch (e) {
      if (e instanceof Error) {
        return commandObj.error(e.message);
      }

      throw e;
    }
  };
}
