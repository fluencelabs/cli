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

import { color } from "@oclif/color";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initNewEnvConfig } from "../../lib/configs/project/env/env.js";
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { ENV_ARG } from "../../lib/const.js";
import { ensureAquaFileWithWorkerInfo } from "../../lib/deployWorkers.js";
import { initCli } from "../../lib/lifeCycle.js";
import { updateRelaysJSON } from "../../lib/multiaddres.js";
import { ensureValidFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Env extends BaseCommand<typeof Env> {
  static override description = "Switch default Fluence Environment";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override args = {
    ...ENV_ARG,
  };
  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(Env));
    const envConfig = await initNewEnvConfig();
    const fluenceEnv = await ensureValidFluenceEnv(args.ENV);
    envConfig.fluenceEnv = fluenceEnv;
    await envConfig.$commit();

    if ((await initFluenceConfig()) !== null) {
      await updateRelaysJSON();
      await ensureAquaFileWithWorkerInfo();
    }

    commandObj.log(
      `Successfully set default fluence environment to ${color.yellow(
        fluenceEnv,
      )}`,
    );
  }
}
