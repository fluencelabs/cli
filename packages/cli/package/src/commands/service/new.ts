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

import { join, relative, resolve } from "node:path";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { addService, ensureValidServiceName } from "../../lib/addService.js";
import { commandObj } from "../../lib/commandObj.js";
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { initNewReadonlyServiceConfig } from "../../lib/configs/project/service.js";
import { generateNewModule } from "../../lib/generateNewModule.js";
import { AQUA_NAME_REQUIREMENTS } from "../../lib/helpers/downloadFile.js";
import { initCli } from "../../lib/lifeCycle.js";
import { initMarineCli } from "../../lib/marineCli.js";
import { ensureServicesDir } from "../../lib/paths.js";
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
    const { args, flags } = await initCli(this, await this.parse(New));
    const fluenceConfig = await initFluenceConfig();

    const serviceName = await ensureValidServiceName(
      args.name ?? (await input({ message: "Enter service name" })),
    );

    const absoluteServicePath = resolve(
      join(flags.path ?? (await ensureServicesDir()), serviceName),
    );

    const pathToModuleDir = join(absoluteServicePath, serviceName);
    await generateNewModule(pathToModuleDir, serviceName);

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

    if (fluenceConfig !== null) {
      const marineCli = await initMarineCli();

      await addService({
        marineCli,
        serviceName,
        absolutePathOrUrl: absoluteServicePath,
      });
    }
  }
}
