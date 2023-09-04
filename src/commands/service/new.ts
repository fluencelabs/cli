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

import { join, relative, resolve } from "node:path";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { addService } from "../../lib/addService.js";
import { commandObj } from "../../lib/commandObj.js";
import { initNewReadonlyServiceConfig } from "../../lib/configs/project/service.js";
import { generateNewModule } from "../../lib/generateNewModule.js";
import {
  AQUA_NAME_REQUIREMENTS,
  ensureValidAquaName,
} from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { ensureSrcServicesDir } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create new marine service template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    path: Flags.string({
      description: "Path to services dir (default: src/services)",
      helpValue: "<path>",
    }),
  };
  static override args = {
    name: Args.string({
      description: `Unique service name (${AQUA_NAME_REQUIREMENTS})`,
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(New),
    );

    let serviceName = await ensureValidAquaName({
      stringToValidate:
        args.name ?? (await input({ message: "Enter service name" })),
      message: "Enter service name",
    });

    if (serviceName in (maybeFluenceConfig?.services ?? {})) {
      serviceName = await input({
        message: serviceAlreadyExistsError(serviceName),
        validate: (serviceName: string) => {
          if (serviceName in (maybeFluenceConfig?.services ?? {})) {
            return serviceAlreadyExistsError(serviceName);
          }

          return true;
        },
      });
    }

    const absoluteServicePath = resolve(
      join(flags.path ?? (await ensureSrcServicesDir()), serviceName),
    );

    const pathToModuleDir = join(absoluteServicePath, "modules", serviceName);
    await generateNewModule(pathToModuleDir);

    await initNewReadonlyServiceConfig(
      absoluteServicePath,
      relative(absoluteServicePath, pathToModuleDir),
      serviceName,
    );

    commandObj.log(
      `Successfully generated template for new service at ${color.yellow(
        absoluteServicePath,
      )}`,
    );

    if (maybeFluenceConfig !== null) {
      const marineCli = await initMarineCli(maybeFluenceConfig);

      await addService({
        marineCli,
        serviceName,
        absolutePathOrUrl: absoluteServicePath,
        fluenceConfig: maybeFluenceConfig,
      });
    }
  }
}

const serviceAlreadyExistsError = (serviceName: string) => {
  return `Service with name ${color.yellow(
    serviceName,
  )} already exists. Please enter another name`;
};
