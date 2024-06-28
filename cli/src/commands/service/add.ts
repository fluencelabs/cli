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

import { isAbsolute, resolve } from "node:path";
import { cwd } from "node:process";

import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { ensureValidServiceName, addService } from "../../lib/addService.js";
import { commandObj } from "../../lib/commandObj.js";
import { initReadonlyServiceConfig } from "../../lib/configs/project/service.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MARINE_BUILD_ARGS_FLAG,
} from "../../lib/const.js";
import {
  AQUA_NAME_REQUIREMENTS,
  isUrl,
} from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
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
    ...MARINE_BUILD_ARGS_FLAG,
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
      commandObj.error(
        `No service config found at ${serviceOrServiceDirPathOrUrl}`,
      );
    }

    const serviceName = await ensureValidServiceName(
      fluenceConfig,
      flags.name ?? serviceConfig.name,
    );

    const marineCli = await initMarineCli();

    await addService({
      serviceName,
      absolutePathOrUrl: resolveServicePathOrUrl(serviceOrServiceDirPathOrUrl),
      fluenceConfig,
      marineCli,
      marineBuildArgs: flags["marine-build-args"],
    });
  }
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
