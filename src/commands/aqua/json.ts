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

import { readFile, writeFile } from "fs/promises";

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { FS_OPTIONS } from "../../lib/const.js";
import { jsToAqua } from "../../lib/helpers/jsToAqua.js";
import { initCli } from "../../lib/lifecyle.js";
import { input } from "../../lib/prompt.js";

export default class Json extends BaseCommand<typeof Json> {
  static override description = "Generate aqua data structure from json";
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    FUNC: Args.string({
      description: "Name of the exported function",
    }),
    INPUT: Args.string({
      description: "Path to json file",
    }),
    OUTPUT: Args.string({
      description: "Path to for output file",
    }),
  };

  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(Json));

    const content = await readFile(
      args.INPUT ?? (await input({ message: "Enter path to input file" })),
      FS_OPTIONS
    );

    const parsedContent: unknown = JSON.parse(content);

    if (parsedContent === null || typeof parsedContent !== "object") {
      return commandObj.error("Input file must contain json object");
    }

    const aqua = jsToAqua(
      parsedContent,
      args.FUNC ?? (await input({ message: "Enter exported function name" }))
    );

    await writeFile(
      args.OUTPUT ??
        (await input({ message: "Enter path for an output file" })),
      aqua,
      FS_OPTIONS
    );

    commandObj.log("Done!");
  }
}
