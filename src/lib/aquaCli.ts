/**
 * Copyright 2023 Fluence Labs Limited
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

import type { FluenceConfig } from "./configs/project/fluence.js";
import { AQUA_NPM_DEPENDENCY, DOT_BIN_DIR_NAME } from "./const.js";
import { execPromise } from "./execPromise.js";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs.js";
import { ensureNpmDependency } from "./npm.js";
import type { Flags, OptionalFlags } from "./typeHelpers.js";

/**
 * Execution timeout in milliseconds
 */
const AQUA_CLI_EXECUTION_TIMEOUT = 90_000;

export type AquaCompilerFlags = Flags<"input"> &
  OptionalFlags<
    | "output"
    | "js"
    | "air"
    | "log-level"
    | "const"
    | "no-relay"
    | "no-xor"
    | "dry"
    | "scheduled"
    | "old-fluence-js"
    | "import"
  > & { timeout?: never };

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
          | "print-air"
          | "log-level"
          | "no-xor"
          | "no-relay"
        >;
    }
  | {
      args?: never;
      flags: AquaCompilerFlags;
    };

export type AquaCLI = {
  (
    aquaCliInput: AquaCliInput,
    message?: string | undefined,
    keyValuePairs?: Record<string, string>
  ): Promise<string>;
};

export const initAquaCli = async (
  maybeFluenceConfig: FluenceConfig | null
): Promise<AquaCLI> => {
  const aquaCLIDirPath = await ensureNpmDependency({
    nameAndVersion: AQUA_NPM_DEPENDENCY,
    maybeFluenceConfig,
  });

  const aquaCLIPath = join(aquaCLIDirPath, DOT_BIN_DIR_NAME, "aqua");

  return (aquaCliInput, message, keyValuePairs): Promise<string> => {
    const { args, flags } = aquaCliInput;

    const timeoutNumber = Number(flags.timeout);

    return execPromise({
      command: aquaCLIPath,
      args,
      flags,
      spinnerMessage:
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
