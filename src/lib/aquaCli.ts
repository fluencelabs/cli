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

import { CommandObj, DEPENDENCIES } from "./const";
import { execPromise } from "./execPromise";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs";
import { unparseFlags } from "./helpers/unparseFlags";
import { ensureNpmDependency } from "./npm";

type Flags<T extends string> = Record<
  T,
  string | boolean | Array<string | undefined>
>;
type OptionalFlags<T extends string> = Partial<
  Record<T, string | boolean | undefined | Array<string | undefined>>
>;

export type AquaCliInput =
  | {
      command: "remote deploy_service";
      flags: Flags<"addr" | "sk" | "service" | "config-path"> &
        OptionalFlags<"on" | "timeout">;
    }
  | {
      command: "remote create_service";
      flags: Flags<"addr" | "sk" | "id"> & OptionalFlags<"on" | "timeout">;
    }
  | {
      command: "remote remove_service";
      flags: Flags<"addr" | "sk" | "id"> & OptionalFlags<"on" | "timeout">;
    }
  | {
      command: "run";
      flags: Flags<"addr" | "input" | "func"> &
        OptionalFlags<"on" | "timeout" | "data" | "import" | "json-service">;
    }
  | {
      command?: never;
      flags: Flags<"input" | "output"> &
        OptionalFlags<"js"> & { timeout?: never };
    };

export type AquaCLI = {
  (
    aquaCliInput: AquaCliInput,
    message?: string | undefined,
    keyValuePairs?: Record<string, string>
  ): Promise<string>;
};

export const initAquaCli = async (
  commandObj: CommandObj,
  isInteractive: boolean
): Promise<AquaCLI> => {
  const aquaCliPath = await ensureNpmDependency({
    dependency: DEPENDENCIES.aqua,
    commandObj,
    confirmMessage:
      "Aqua CLI dependency needs to be updated. Do you want to continue?",
    installMessage: "Downloading Aqua CLI, may take a while",
    isInteractive,
  });

  return (aquaCliInput, message, keyValuePairs): Promise<string> => {
    const { command, flags } = aquaCliInput;

    const timeoutNumber = Number(flags.timeout);

    return execPromise(
      `${aquaCliPath} ${command ?? ""}${unparseFlags(flags)}`,
      message === undefined
        ? undefined
        : getMessageWithKeyValuePairs(message, keyValuePairs),
      Number.isNaN(timeoutNumber) ? undefined : timeoutNumber
    );
  };
};
