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

import { readFile } from "fs/promises";

import type Beautify from "../../commands/air/beautify.js";
import { commandObj } from "../../lib/commandObj.js";
import { FS_OPTIONS } from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export async function beautifyImpl(
  this: Beautify,
  command: typeof Beautify,
): Promise<void> {
  const { args } = await initCli(this, await this.parse(command));

  const inputArg =
    args.PATH ??
    (await input({
      message: `Enter a path to an AIR file`,
    }));

  const air = await readFile(inputArg, FS_OPTIONS);
  const { beautify } = await import("@fluencelabs/air-beautify-wasm");
  commandObj.log(beautify(air));
}
