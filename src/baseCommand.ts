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

import { Command, Flags, Interfaces } from "@oclif/core";

import { NO_INPUT_FLAG } from "./lib/const.js";
import { exitCli } from "./lib/lifecyle.js";

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)["baseFlags"] & T["flags"]
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;
/**
 * As of Feb 3 2023 for some reason oclif's baseFlags are not working so we have to do this explicitly
 */
export const baseFlags = {
  ...NO_INPUT_FLAG,
};

export abstract class BaseCommand<T extends typeof Command> extends Command {
  protected flags!: Flags<T>;
  protected args!: Args<T>;

  protected override async finally(
    maybeError: Error | undefined
  ): Promise<unknown> {
    // called after run and catch regardless of whether or not the command errored
    if (maybeError === undefined) {
      await super.finally(maybeError);
      await exitCli();
    }

    return super.finally(maybeError);
  }
}
