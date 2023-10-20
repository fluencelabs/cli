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

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import {
  PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { createSecretKey } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";

export default class New extends BaseCommand<typeof New> {
  static override description = `Generate key-pair and store it in ${USER_SECRETS_CONFIG_FULL_FILE_NAME} or ${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    user: Flags.boolean({
      default: false,
      description:
        "Generate key-pair for current user instead of generating key-pair for current project",
    }),
    default: Flags.boolean({
      default: false,
      description: "Set new key-pair as default for current project or user",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Key-pair name",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(New),
    );

    await createSecretKey({
      isUser: flags.user,
      name: args.name,
      maybeFluenceConfig,
    });
  }
}
