/**
 * Copyright 2024 Fluence DAO
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

import { jsonStringify } from "@repo/common";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { getAquaImports } from "../../lib/helpers/aquaImports.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class Json extends BaseCommand<typeof Json> {
  static override description =
    "Returns a list of aqua imports that CLI produces";
  static override flags = {
    ...baseFlags,
  };

  async run(): Promise<void> {
    const { maybeFluenceConfig: fluenceConfig } = await initCli(
      this,
      await this.parse(Json),
    );

    commandObj.log(jsonStringify(await getAquaImports({ fluenceConfig })));
  }
}
