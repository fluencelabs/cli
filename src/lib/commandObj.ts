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

import type { Command } from "@oclif/core";
import { CLIError } from "@oclif/core/lib/errors/index.js";

export type CommandObj = InstanceType<typeof Command>;
export let commandObj: CommandObj =
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  {
    log(msg: string) {
      // eslint-disable-next-line no-console
      console.log(msg);
    },
    logToStderr(msg: string) {
      // eslint-disable-next-line no-console
      console.error(msg);
    },
    error(msg: string): never {
      throw new CLIError(msg);
    },
  } as CommandObj;
export let isInteractive: boolean;

export const setCommandObjAndIsInteractive = (
  newCommandObj: CommandObj,
  newIsInteractive: boolean,
): void => {
  commandObj = newCommandObj;
  isInteractive = newIsInteractive;
};
