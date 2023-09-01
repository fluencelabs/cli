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

import { isAbsolute, resolve } from "node:path";
import { cwd } from "node:process";

import type Add from "../../commands/service/add.js";
import { addService } from "../../lib/addService.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyServiceConfig } from "../../lib/configs/project/service.js";
import { isUrl } from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { input } from "../../lib/prompt.js";

const PATH_OR_URL = "PATH | URL";

export async function addImpl(this: Add, command: typeof Add): Promise<void> {
  const { args, flags, fluenceConfig } = await initCli(
    this,
    await this.parse(command),
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
    commandObj.error(
      `No service config found at ${serviceOrServiceDirPathOrUrl}`,
    );
  }

  const marineCli = await initMarineCli(fluenceConfig);

  await addService({
    serviceName: flags.name ?? serviceConfig.name,
    absolutePathOrUrl: resolveServicePathOrUrl(serviceOrServiceDirPathOrUrl),
    fluenceConfig,
    marineCli,
    marineBuildArgs: flags["marine-build-args"],
  });
}

const resolveServicePathOrUrl = (serviceOrServiceDirPathOrUrl: string) => {
  if (
    isUrl(serviceOrServiceDirPathOrUrl) ||
    isAbsolute(serviceOrServiceDirPathOrUrl)
  ) {
    return serviceOrServiceDirPathOrUrl;
  }

  return resolve(serviceOrServiceDirPathOrUrl);
};
