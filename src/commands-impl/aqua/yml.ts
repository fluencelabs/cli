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

import { readFile, writeFile } from "fs/promises";

import type Yaml from "../../commands/aqua/yml.js";
import { commandObj } from "../../lib/commandObj.js";
import { FS_OPTIONS } from "../../lib/const.js";
import { jsToAqua } from "../../lib/helpers/jsToAqua.js";
import { initCli } from "../../lib/lifeCycle.js";
import { input } from "../../lib/prompt.js";

export async function yamlImpl(
  this: Yaml,
  command: typeof Yaml,
): Promise<void> {
  const { args, flags } = await initCli(this, await this.parse(command));

  const content = await readFile(
    args.INPUT ?? (await input({ message: "Enter path to input file" })),
    FS_OPTIONS,
  );

  const { parse } = await import("yaml");
  const parsedContent: unknown = parse(content);

  const aqua = jsToAqua(
    parsedContent,
    args.FUNC ?? (await input({ message: "Enter exported function name" })),
    flags.f64,
  );

  await writeFile(
    args.OUTPUT ?? (await input({ message: "Enter path for an output file" })),
    aqua,
    FS_OPTIONS,
  );

  commandObj.logToStderr("Done!");
}
