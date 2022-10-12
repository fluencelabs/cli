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
import { AQUA_NPM_DEPENDENCY, CommandObj } from "./const";
import { execPromise } from "./execPromise";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs";
import { ensureNpmDependency } from "./npm";
import type { Flags, OptionalFlags } from "./typeHelpers";

/**
 * Execution timeout in milliseconds
 */
const AQUA_CLI_EXECUTION_TIMEOUT = 90_000;

export type AquaCliInput =
  | {
      args: ["remote", "deploy_service"];
      flags: Flags<"addr" | "sk" | "service" | "config-path"> &
        OptionalFlags<"on" | "timeout" | "log-level" | "verbose" | "print-air">;
    }
  | {
      args: ["remote", "create_service"];
      flags: Flags<"addr" | "sk" | "id"> & OptionalFlags<"on" | "timeout">;
    }
  | {
      args: ["remote", "remove_service"];
      flags: Flags<"addr" | "sk" | "id"> & OptionalFlags<"on" | "timeout">;
    }
  | {
      args: ["run"];
      flags: Flags<"addr" | "input" | "func"> &
        OptionalFlags<
          | "on"
          | "timeout"
          | "data"
          | "import"
          | "json-service"
          | "sk"
          | "plugin"
          | "const"
        >;
    }
  | {
      args?: never;
      flags: Flags<"input" | "output"> &
        OptionalFlags<
          | "js"
          | "air"
          | "js"
          | "log-level"
          | "const"
          | "no-relay"
          | "no-xor"
          | "dry"
          | "scheduled"
        > & { timeout?: never };
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
  fluenceConfig: FluenceConfig | null
): Promise<AquaCLI> => {
  const aquaCliPath = await ensureNpmDependency({
    nameAndVersion: AQUA_NPM_DEPENDENCY,
    commandObj,
    fluenceConfig,
  });

  return (aquaCliInput, message, keyValuePairs): Promise<string> => {
    const { args, flags } = aquaCliInput;

    const timeoutNumber = Number(flags.timeout);

    return execPromise({
      command: aquaCliPath,
      args,
      flags,
      message:
        message === undefined
          ? undefined
          : getMessageWithKeyValuePairs(message, keyValuePairs),
      timeout: Number.isNaN(timeoutNumber)
        ? AQUA_CLI_EXECUTION_TIMEOUT
        : timeoutNumber,
      printOutput: true,
    });
  };
};
