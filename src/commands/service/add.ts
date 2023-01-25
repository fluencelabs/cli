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

import path from "node:path";

import color from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import { addService } from "../../lib/addService";
import { initFluenceLockConfig } from "../../lib/configs/project/fluenceLock";
import { initReadonlyModuleConfig } from "../../lib/configs/project/module";
import {
  FACADE_MODULE_NAME,
  initReadonlyServiceConfig,
} from "../../lib/configs/project/service";
import {
  FLUENCE_CONFIG_FILE_NAME,
  NAME_FLAG_NAME,
  SERVICE_CONFIG_FILE_NAME,
} from "../../lib/const";
import {
  AQUA_NAME_REQUIREMENTS,
  downloadModule,
  downloadService,
  getModuleWasmPath,
  isUrl,
} from "../../lib/helpers/downloadFile";
import { generateServiceInterface } from "../../lib/helpers/generateServiceInterface";
import { getArg } from "../../lib/helpers/getArg";
import { initCli } from "../../lib/lifecyle";
import { initMarineCli } from "../../lib/marineCli";
import { input } from "../../lib/prompt";

const PATH_OR_URL = "PATH | URL";

export default class Add extends BaseCommand<typeof Add> {
  static override description = `Add service to ${FLUENCE_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    [NAME_FLAG_NAME]: Flags.string({
      description: `Override service name (${AQUA_NAME_REQUIREMENTS})`,
      helpValue: "<name>",
    }),
  };
  static override args = {
    [PATH_OR_URL]: getArg(
      PATH_OR_URL,
      "Path to a service or url to .tar.gz archive"
    ),
  };
  async run(): Promise<void> {
    const { args, flags, isInteractive, commandObj, fluenceConfig } =
      await initCli(this, await this.parse(Add), true);

    const servicePathOrUrl =
      args[PATH_OR_URL] ??
      (await input({ isInteractive, message: "Enter service path or url" }));

    const servicePath = isUrl(servicePathOrUrl)
      ? await downloadService(servicePathOrUrl)
      : servicePathOrUrl;

    const serviceConfig = await initReadonlyServiceConfig(servicePath, this);

    if (serviceConfig === null) {
      this.error(
        `${color.yellow(
          SERVICE_CONFIG_FILE_NAME
        )} not found for ${servicePathOrUrl}`
      );
    }

    const serviceName = await addService({
      commandObj,
      serviceName: flags[NAME_FLAG_NAME] ?? serviceConfig.name,
      pathOrUrl: servicePathOrUrl,
      isInteractive,
      fluenceConfig,
    });

    const facadeModuleGet = serviceConfig.modules[FACADE_MODULE_NAME].get;

    const facadeModulePath = isUrl(facadeModuleGet)
      ? await downloadModule(facadeModuleGet)
      : path.resolve(servicePath, facadeModuleGet);

    const facadeReadonlyConfig = await initReadonlyModuleConfig(
      facadeModulePath,
      this
    );

    if (facadeReadonlyConfig === null) {
      this.error(`Facade module not found at ${facadeModulePath}`);
    }

    const maybeFluenceLockConfig = await initFluenceLockConfig(this);

    const marineCli = await initMarineCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    await generateServiceInterface({
      pathToFacadeWasm: getModuleWasmPath(facadeReadonlyConfig),
      marineCli,
      serviceName,
    });
  }
}
