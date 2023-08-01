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

import { isAbsolute, relative, resolve } from "node:path";
import { cwd } from "node:process";

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { addService } from "../../lib/addService.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyServiceConfig } from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MARINE_BUILD_ARGS,
} from "../../lib/const.js";
import {
  AQUA_NAME_REQUIREMENTS,
  isUrl,
} from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { projectRootDir } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";

const PATH_OR_URL = "PATH | URL";

export default class Add extends BaseCommand<typeof Add> {
  static override description = `Add service to ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    name: Flags.string({
      description: `Override service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
    ...MARINE_BUILD_ARGS,
  };
  static override args = {
    [PATH_OR_URL]: Args.string({
      description: "Path to a service or url to .tar.gz archive",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, fluenceConfig } = await initCli(
      this,
      await this.parse(Add),
      true,
    );

    const serviceOrServiceDirPathOrUrl =
      args[PATH_OR_URL] ??
      (await input({ message: "Enter service path or url" }));

    const serviceConfig = await initReadonlyServiceConfig(
      serviceOrServiceDirPathOrUrl,
      cwd(),
    );

    if (serviceConfig === null) {
      commandObj.error(`No service config at ${serviceOrServiceDirPathOrUrl}`);
    }

    const marineCli = await initMarineCli(fluenceConfig);

    await addService({
      serviceName: flags.name ?? serviceConfig.name,
      pathOrUrl: resolveServicePathOrUrl(serviceOrServiceDirPathOrUrl),
      fluenceConfig,
      marineCli,
      marineBuildArgs: flags["marine-build-args"],
    });
  }
}

const resolveServicePathOrUrl = (serviceOrServiceDirPathOrUrl: string) => {
  if (isUrl(serviceOrServiceDirPathOrUrl)) {
    return serviceOrServiceDirPathOrUrl;
  }

  if (isAbsolute(serviceOrServiceDirPathOrUrl)) {
    return relative(projectRootDir, serviceOrServiceDirPathOrUrl);
  }

  return relative(projectRootDir, resolve(serviceOrServiceDirPathOrUrl));
};
