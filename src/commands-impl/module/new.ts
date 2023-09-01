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

import { join, relative } from "path";

import { color } from "@oclif/color";

import type New from "../../commands/module/new.js";
import { commandObj } from "../../lib/commandObj.js";
import { ensureServiceConfig } from "../../lib/configs/project/service.js";
import { generateNewModule } from "../../lib/generateNewModule.js";
import { isUrl } from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureSrcModulesDir } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";

export async function newImpl(this: New, command: typeof New): Promise<void> {
  const { args, flags, maybeFluenceConfig } = await initCli(
    this,
    await this.parse(command),
  );

  if (typeof args.name === "string") {
    const moduleNameValidity = validateModuleName(args.name);

    if (moduleNameValidity !== true) {
      commandObj.warn(moduleNameValidity);
      args.name = undefined;
    }
  }

  const moduleName =
    args.name ??
    (await input({
      message: "Enter module name",
      validate: validateModuleName,
    }));

  const pathToModulesDir = flags.path ?? (await ensureSrcModulesDir());
  const pathToModuleDir = join(pathToModulesDir, moduleName);
  await generateNewModule(pathToModuleDir);

  commandObj.log(
    `Successfully generated template for new module at ${color.yellow(
      pathToModuleDir,
    )}`,
  );

  if (flags.service === undefined) {
    return;
  }

  if (isUrl(flags.service)) {
    return commandObj.error(
      "Can't update service by URL. Please, specify service name or path to the service config",
    );
  }

  const serviceConfig = await ensureServiceConfig(
    flags.service,
    maybeFluenceConfig,
  );

  serviceConfig.modules[moduleName] = {
    get: relative(serviceConfig.$getDirPath(), pathToModuleDir),
  };

  await serviceConfig.$commit();

  commandObj.log(
    `Added module ${color.yellow(
      pathToModuleDir,
    )} to service ${serviceConfig.$getPath()}`,
  );
}

const validateModuleName = (name: string): string | true => {
  if (
    name.length === 0 ||
    name.includes(" ") ||
    name.includes("\\") ||
    name.includes("/")
  ) {
    return "Module name cannot be empty, contain spaces or slashes";
  }

  return true;
};
