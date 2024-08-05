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

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { commandObj } from "../lib/commandObj.js";
import { initNewWorkersConfigReadonly } from "../lib/configs/project/workers.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MARINE_BUILD_ARGS_FLAG,
  IMPORT_FLAG,
  ENV_FLAG,
} from "../lib/const.js";
import { prepareForDeploy } from "../lib/deployWorkers.js";
import { initCli } from "../lib/lifeCycle.js";
import { ensureFluenceEnv } from "../lib/resolveFluenceEnv.js";

export default class Build extends BaseCommand<typeof Build> {
  static override description = `Build all application services, described in ${FLUENCE_CONFIG_FULL_FILE_NAME} and generate aqua interfaces for them`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...MARINE_BUILD_ARGS_FLAG,
    ...IMPORT_FLAG,
    ...ENV_FLAG,
  };
  async run(): Promise<void> {
    const { fluenceConfig, flags } = await initCli(
      this,
      await this.parse(Build),
      true,
    );

    const fluenceEnv = await ensureFluenceEnv();

    await prepareForDeploy({
      flags: {
        ...flags,
        "no-build": false,
      },
      fluenceConfig,
      fluenceEnv,
      isBuildCheck: true,
      deploymentNamesString: Object.keys(fluenceConfig.deployments ?? {}).join(
        ",",
      ),
    });

    const { ensureAquaFileWithWorkerInfo } = await import(
      "../lib/deployWorkers.js"
    );

    const workerConfig = await initNewWorkersConfigReadonly();
    await ensureAquaFileWithWorkerInfo(workerConfig, fluenceConfig, fluenceEnv);

    commandObj.logToStderr(
      `All services and spells built, all aqua files generated and compiled successfully`,
    );
  }
}
