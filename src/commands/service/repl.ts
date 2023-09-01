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

import { Command, Args } from "@oclif/core";

import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MARINE_BUILD_ARGS_FLAG,
  NO_INPUT_FLAG,
} from "../../lib/const.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

/**
 * This command doesn't extend BaseCommand like other commands do because it
 * spawns a separate repl process which should keep cli alive
 * This means we have to manually call exitCli() in all other cases before
 * the final return statement
 */
export default class REPL extends Command {
  static override description =
    "Open service inside repl (downloads and builds modules if necessary)";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    ...MARINE_BUILD_ARGS_FLAG,
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Service name from ${FLUENCE_CONFIG_FULL_FILE_NAME}, path to a service or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { REPLImpl } = await import("../../commands-impl/service/repl.js");
    await REPLImpl.bind(this)(REPL);
  }
}
