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

import color from "@oclif/color";
import { Command } from "@oclif/core";

import { initFluenceConfig } from "../../lib/configs/project/fluence";
import { NO_INPUT_FLAG } from "../../lib/const";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir";
import { usage } from "../../lib/helpers/usage";

export const SERVICE = "SERVICE";

export default class Add extends Command {
  static override description = "Initialize fluence project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: SERVICE,
      description: "Relative path to a service or url to .tar.gz archive",
    },
  ];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Add);
    const isInteractive = getIsInteractive(flags);
    await ensureFluenceProject(this, isInteractive);

    assert(typeof args[SERVICE] === "string");
    const fluenceConfig = await initFluenceConfig(this);
    if (fluenceConfig.services === undefined) {
      fluenceConfig.services = [];
    }
    if (
      fluenceConfig.services.some(({ get }): boolean => get === args[SERVICE])
    ) {
      this.error(
        `You already have ${color.yellow(args[SERVICE])}\nin ${color.yellow(
          replaceHomeDir(fluenceConfig.$getPath())
        )}`
      );
    }
    fluenceConfig.services.push({
      get: args[SERVICE],
      deploy: [{ count: 1 }],
    });
    await fluenceConfig.$commit();
    this.log(
      `Added ${color.yellow(args[SERVICE])}\nto ${color.yellow(
        replaceHomeDir(fluenceConfig.$getPath())
      )}`
    );
  }
}
