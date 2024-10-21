/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { join, relative } from "path";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { ensureServiceConfig } from "../../lib/configs/project/service.js";
import { generateNewModule } from "../../lib/generateNewModule.js";
import { isUrl } from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { ensureModulesDir } from "../../lib/paths.js";
import { input } from "../../lib/prompt.js";

export default class New extends BaseCommand<typeof New> {
  static override description = "Create new marine module template";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    path: Flags.string({
      description: "Path to module dir (default: src/modules)",
      helpValue: "<path>",
    }),
    service: Flags.string({
      description:
        "Name or relative path to the service to add the created module to",
      helpValue: "<name | relative_path>",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Module name",
    }),
  };
  async run(): Promise<void> {
    const { args, flags } = await initCli(this, await this.parse(New));

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

    const pathToModulesDir = flags.path ?? (await ensureModulesDir());
    const pathToModuleDir = join(pathToModulesDir, moduleName);
    const fluenceConfig = await initFluenceConfig();

    const serviceName =
      flags.service === undefined
        ? undefined
        : fluenceConfig?.services?.[flags.service] === undefined
          ? undefined
          : flags.service;

    await generateNewModule(pathToModuleDir, serviceName);

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

    const serviceConfig = await ensureServiceConfig(flags.service);

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
