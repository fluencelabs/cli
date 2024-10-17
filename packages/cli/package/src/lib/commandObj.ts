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
