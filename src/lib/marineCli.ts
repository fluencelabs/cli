/**
 * Copyright 2022 Fluence Labs Limited
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

import type { FluenceConfig } from "./configs/project/fluence";
import { CommandObj, MARINE_CARGO_DEPENDENCY } from "./const";
import { execPromise } from "./execPromise";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs";
import { ensureCargoDependency } from "./rust";
import type { Flags } from "./typeHelpers";

export type MarineCliInput =
  | {
      args: ["aqua"] | ["aqua", string];
      flags?: never;
    }
  | {
      args: ["build"];
      flags: Flags<"release">;
    };

export type MarineCLI = {
  (
    args: {
      message?: string | undefined;
      keyValuePairs?: Record<string, string>;
      cwd?: string;
    } & MarineCliInput
  ): Promise<string>;
};

export const initMarineCli = async (
  commandObj: CommandObj,
  fluenceConfig: FluenceConfig | null
): Promise<MarineCLI> => {
  const marineCliPath = await ensureCargoDependency({
    nameAndVersion: MARINE_CARGO_DEPENDENCY,
    commandObj,
    fluenceConfig,
  });

  return async ({
    args,
    flags,
    message,
    keyValuePairs,
    cwd,
  }): Promise<string> =>
    execPromise({
      command: marineCliPath,
      args,
      flags,
      message:
        message === undefined
          ? undefined
          : getMessageWithKeyValuePairs(message, keyValuePairs),
      options: { cwd },
      printOutput: true,
    });
};
