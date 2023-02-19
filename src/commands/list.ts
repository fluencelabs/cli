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

import oclifColor from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { jsonPrint } from "../lib/helpers/jsonPrint.js";
import { jsonStringify } from "../lib/helpers/jsonStringify.js";
import { initCli } from "../lib/lifecyle.js";
import { readFluenceProjectConfig } from "../lib/readFluenceProjectConfig.js";

const color = oclifColor.default;

export default class List extends BaseCommand<typeof List> {
  static override description = "Run aqua script";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    json: Flags.boolean({ description: "JSON description" }),
    paths: Flags.boolean({ description: "PATHS description" }),
    modules: Flags.boolean({ description: "MODULES description" }),
  };

  async run(): Promise<void> {
    const parseResult = await this.parse(List);
    const { json, paths } = parseResult.flags;
    const { fluenceConfig } = await initCli(this, await this.parse(List), true);

    const config = await readFluenceProjectConfig(fluenceConfig, {
      paths,
      modules: true,
    });

    const template = json ? jsonStringify(config) : jsonPrint(config);

    this.log(`\n${color.yellow("Result:")}\n\n${template}`);
  }
}
