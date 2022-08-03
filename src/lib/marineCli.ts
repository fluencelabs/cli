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

import {
  CARGO_GENERATE_CARGO_DEPENDENCY,
  CommandObj,
  MARINE_CARGO_DEPENDENCY,
} from "./const";
import { execPromise } from "./execPromise";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs";
import { unparseFlags } from "./helpers/unparseFlags";
import { ensureCargoDependency } from "./rust";
import type { Flags } from "./typeHelpers";

export type MarineCliInput =
  | {
      command: "generate";
      flags: Flags<"init" | "name">;
    }
  | {
      command: "build";
      flags: Flags<"release">;
    };

export type MarineCLI = {
  (
    args: {
      message?: string | undefined;
      keyValuePairs?: Record<string, string>;
      workingDir?: string;
    } & MarineCliInput
  ): Promise<string>;
};

export const initMarineCli = async (
  commandObj: CommandObj
): Promise<MarineCLI> => {
  const marineCliPath = await ensureCargoDependency({
    name: MARINE_CARGO_DEPENDENCY,
    commandObj,
  });

  await ensureCargoDependency({
    name: CARGO_GENERATE_CARGO_DEPENDENCY,
    commandObj,
  });

  return async ({
    command,
    flags,
    message,
    keyValuePairs,
    workingDir,
  }): Promise<string> => {
    const cwd = process.cwd();

    if (workingDir !== undefined) {
      process.chdir(workingDir);
    }

    const result = await execPromise(
      `${marineCliPath} ${command ?? ""}${unparseFlags(flags, commandObj)}`,
      message === undefined
        ? undefined
        : getMessageWithKeyValuePairs(message, keyValuePairs)
    );

    if (workingDir !== undefined) {
      process.chdir(cwd);
    }

    return result;
  };
};
