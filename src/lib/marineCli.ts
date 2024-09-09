/**
 * Copyright 2024 Fluence DAO
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
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
