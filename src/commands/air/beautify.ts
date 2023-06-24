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

import assert from "assert";
import { readFile } from "fs/promises";

import { beautify } from "@fluencelabs/air-beautify-wasm";
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { FS_OPTIONS } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Beautify extends BaseCommand<typeof Beautify> {
  static override aliases = ["air:b"];
  static override description =
    "Reads an AIR script from standard input and prints it in human-readable Python-like representation. This representation cannot be executed and is intended to be read by mere mortals.";
  static override flags = {
    ...baseFlags,
    input: Flags.string({
      description: `Path to an AIR file. Must be relative to the current working directory or absolute`,
      helpValue: "<path>",
      char: "i",
    }),
  };

  async run(): Promise<void> {
    const { flags } = await initCli(this, await this.parse(Beautify));
    assert(flags.input !== undefined);
    const air = await readFile(flags.input, FS_OPTIONS);
    commandObj.log(beautify(air));
  }
}
