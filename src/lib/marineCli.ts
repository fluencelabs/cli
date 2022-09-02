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

import { CommandObj, MARINE_CARGO_DEPENDENCY } from "./const";
import { execPromise } from "./execPromise";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs";
import { unparseFlags } from "./helpers/unparseFlags";
import { getProjectRootDir } from "./paths";
import { ensureCargoDependency } from "./rust";
import type { Flags } from "./typeHelpers";

export type MarineCliInput =
  | {
      command: "aqua";
      flags?: never;
      args: Array<string>;
    }
  | {
      command: "build";
      flags: Flags<"release">;
      args?: never;
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

  /** This function uses process.chdir - be cautious
   * @returns Marine CLI execution result
   */
  return async ({
    command,
    flags,
    args,
    message,
    keyValuePairs,
    workingDir,
  }): Promise<string> => {
    if (workingDir !== undefined) {
      process.chdir(workingDir);
    }

    const result = await execPromise(
      `${marineCliPath} ${command ?? ""}${
        args === undefined
          ? ""
          : ` ${args.map((arg): string => `'${arg}'`).join(" ")}`
      } ${unparseFlags(flags ?? {}, commandObj)}`,
      message === undefined
        ? undefined
        : getMessageWithKeyValuePairs(message, keyValuePairs)
    );

    if (workingDir !== undefined) {
      process.chdir(getProjectRootDir());
    }

    return result;
  };
};
