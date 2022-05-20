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

import { execPromise } from "./execPromise";
import { ensureNpmDependency } from "./npm";
import { unparseFlags } from "./helpers/unparseFlags";
import { CommandObj, DEPENDENCIES } from "./const";
import { getMessageWithKeyValuePairs } from "./helpers/getMessageWithKeyValuePairs";

type Flags<T extends string> = Record<T, string>;
type OptionalFlags<T extends string> = Partial<Record<T, string | undefined>>;

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
      flags: Flags<"addr" | "input" | "func"> & OptionalFlags<"on" | "timeout">;
    };

export class AquaCLI {
  #aquaCliPathPromise: Promise<string>;

  constructor(commandObj: CommandObj) {
    this.#aquaCliPathPromise = ensureNpmDependency(
      DEPENDENCIES.aqua,
      commandObj,
      "Downloading the latest version of Aqua CLI"
    );
  }

  async run(
    aquaCliInput: AquaCliInput,
    message: string,
    keyValuePairs?: Record<string, string>
  ): Promise<string> {
    const aquaCliPath = await this.#aquaCliPathPromise;
    const { command, flags } = aquaCliInput;

    const timeoutNumber = Number(flags.timeout);

    return execPromise(
      `${aquaCliPath} ${command}${unparseFlags(flags)}`,
      getMessageWithKeyValuePairs(message, keyValuePairs),
      Number.isNaN(timeoutNumber) ? undefined : timeoutNumber
    );
  }
}
