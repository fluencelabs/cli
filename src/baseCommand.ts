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

import { NO_INPUT_FLAG } from "./lib/const";
import { exitCli } from "./lib/lifecyle";

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  typeof BaseCommand["baseFlags"] & T["flags"]
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

export abstract class BaseCommand<T extends typeof Command> extends Command {
  // define flags that can be inherited by any command that extends BaseCommand
  static override baseFlags = {
    ...NO_INPUT_FLAG,
  };

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  override async init(): Promise<void> {
    await super.init();

    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.flags = flags as Flags<T>;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    this.args = args as Args<T>;
  }

  protected override async catch(
    err: Error & { exitCode?: number }
  ): Promise<unknown> {
    // add any custom logic to handle errors from the command
    // or simply return the parent class error handling
    return super.catch(err);
  }

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
