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

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { TEMPLATES, ENV_FLAG } from "../lib/const.js";
import { ensureTemplate, init } from "../lib/init.js";
import { initCli } from "../lib/lifeCycle.js";

export default class Init extends BaseCommand<typeof Init> {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    template: Flags.string({
      description: `Template to use for the project. One of: ${TEMPLATES.join(
        ", ",
      )}`,
      char: "t",
    }),
    ...ENV_FLAG,
  };
  static override args = {
    path: Args.string({
      description: "Project path",
    }),
  };
  async run(): Promise<void> {
    const { flags, args } = await initCli(this, await this.parse(Init));

    await init({
      maybeProjectPath: args.path,
      template: await ensureTemplate({
        templateOrUnknown: flags.template,
      }),
      fluenceEnvFromFlags: flags.env,
    });
  }
}
