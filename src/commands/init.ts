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

import assert from "node:assert";

import { Flags } from "@oclif/core";

import { BaseCommand } from "../baseCommand";
import { templates } from "../lib/const";
import { ensureTemplate, init } from "../lib/init";
import { initCli } from "../lib/lifecyle";

const PATH = "PATH";

export default class Init extends BaseCommand<typeof Init> {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    template: Flags.string({
      description: `Template to use for the project. One of: ${templates.join(
        ", "
      )}`,
      char: "t",
    }),
  };
  static override args = [
    {
      name: PATH,
      description: "Project path",
    },
  ];
  async run(): Promise<void> {
    const { args, commandObj, flags, isInteractive } = await initCli(
      this,
      await this.parse(Init)
    );

    const projectPath: unknown = args[PATH];
    assert(projectPath === undefined || typeof projectPath === "string");

    await init({
      commandObj,
      isInteractive,
      projectPath,
      template: await ensureTemplate({
        isInteractive,
        commandObj,
        templateOrUnknown: flags.template,
      }),
    });
  }
}
