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

import { Command, type Interfaces } from "@oclif/core";

import { NO_INPUT_FLAG } from "./lib/const.js";
import { exitCli } from "./lib/lifeCycle.js";

type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)["baseFlags"] & T["flags"]
>;
type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

const baseFlags = {
  ...NO_INPUT_FLAG,
};

export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected flags!: Flags<T>;
  protected args!: Args<T>;
  static override baseFlags = baseFlags;

  protected override async finally(
    maybeError: Error | undefined,
  ): Promise<unknown> {
    // called after run and catch regardless of whether or not the command errored
    if (maybeError === undefined) {
      await super.finally(maybeError);
      await exitCli();
    }

    return super.finally(maybeError);
  }
}
