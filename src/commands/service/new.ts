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
import path from "node:path";

import color from "@oclif/color";
import { Command, Flags } from "@oclif/core";

import { initNewReadonlyServiceConfig } from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  NAME_FLAG_NAME,
  NO_INPUT_FLAG,
} from "../../lib/const";
import {
  AQUA_NAME_REQUIREMENTS,
  ensureValidAquaName,
} from "../../lib/helpers/downloadFile";
import { getIsInteractive } from "../../lib/helpers/getIsInteractive";
import { confirm, input } from "../../lib/prompt";
import { generateNewModule } from "../module/new";

import { addService } from "./add";

const PATH = "PATH";

export default class New extends Command {
  static override description = "Create new marine service template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...NO_INPUT_FLAG,
    [NAME_FLAG_NAME]: Flags.string({
      description: `Unique service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
  };
  static override args = [
    {
      name: PATH,
      description: "Path to a service",
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(New);
    const isInteractive = getIsInteractive(flags);

    const servicePath: unknown =
      args[PATH] ??
      (await input({ isInteractive, message: "Enter service path" }));

    assert(typeof servicePath === "string");

    const serviceName = await ensureValidAquaName({
      stringToValidate: flags[NAME_FLAG_NAME],
      message: "Enter service name",
      flagName: NAME_FLAG_NAME,
      isInteractive,
    });

    const pathToModuleDir = path.join(servicePath, "modules", serviceName);
    await generateNewModule(pathToModuleDir, this);

    await initNewReadonlyServiceConfig(
      servicePath,
      this,
      path.relative(servicePath, pathToModuleDir),
      serviceName
    );

    this.log(
      `Successfully generated template for new service at ${color.yellow(
        servicePath
      )}`
    );

    if (
      isInteractive &&
      (await confirm({
        isInteractive,
        message: `Do you want add ${color.yellow(
          serviceName
        )} to ${color.yellow(FLUENCE_CONFIG_FILE_NAME)}?`,
      }))
    ) {
      await addService({
        commandObj: this,
        serviceName,
        pathOrUrl: servicePath,
        isInteractive,
      });
    }
  }
}
