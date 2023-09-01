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

import { Args } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { FLUENCE_CONFIG_FULL_FILE_NAME } from "../../lib/const.js";

const NAME_OR_PATH_OR_URL = "NAME | PATH | URL";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove service from ${FLUENCE_CONFIG_FULL_FILE_NAME} services property and from all of the workers`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    [NAME_OR_PATH_OR_URL]: Args.string({
      description: `Service name from ${FLUENCE_CONFIG_FULL_FILE_NAME}, path to a service or url to .tar.gz archive`,
    }),
  };
  async run(): Promise<void> {
    const { removeImpl } = await import(
      "../../commands-impl/service/remove.js"
    );

    await removeImpl.bind(this)(Remove);
  }
}
