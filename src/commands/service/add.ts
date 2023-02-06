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

import color from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import { addService } from "../../lib/addService";
import { initFluenceLockConfig } from "../../lib/configs/project/fluenceLock";
import { initReadonlyServiceConfig } from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import {
  AQUA_NAME_REQUIREMENTS,
  downloadService,
  isUrl,
} from "../../lib/helpers/downloadFile";
import { initCli } from "../../lib/lifecyle";
import { initMarineCli } from "../../lib/marineCli";
import { input } from "../../lib/prompt";

const PATH_OR_URL = "PATH | URL";

export default class Add extends BaseCommand<typeof Add> {
  static override description = `Add service to ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    name: Flags.string({
      description: `Override service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
  };
  static override args = {
    [PATH_OR_URL]: Args.string({
      description: "Path to a service or url to .tar.gz archive",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, isInteractive, commandObj, fluenceConfig } =
      await initCli(this, await this.parse(Add), true);

    const servicePathOrUrl =
      args[PATH_OR_URL] ??
      (await input({ isInteractive, message: "Enter service path or url" }));

    const serviceDirPath = isUrl(servicePathOrUrl)
      ? await downloadService(servicePathOrUrl)
      : servicePathOrUrl;

    const serviceConfig = await initReadonlyServiceConfig(
      serviceDirPath,
      commandObj
    );

    if (serviceConfig === null) {
      this.error(
        `${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )} not found for ${servicePathOrUrl}`
      );
    }

    const maybeFluenceLockConfig = await initFluenceLockConfig(commandObj);

    const marineCli = await initMarineCli(
      commandObj,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    await addService({
      commandObj,
      serviceName: flags.name ?? serviceConfig.name,
      pathOrUrl: servicePathOrUrl,
      isInteractive,
      fluenceConfig,
      marineCli,
      serviceConfig,
    });
  }
}
