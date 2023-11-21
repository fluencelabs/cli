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

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { build } from "../lib/build.js";
import { commandObj } from "../lib/commandObj.js";
import { initNewWorkersConfig } from "../lib/configs/project/workers.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MARINE_BUILD_ARGS_FLAG,
  IMPORT_FLAG,
} from "../lib/const.js";
import { compileSpells } from "../lib/deployWorkers.js";
import { ensureAquaImports } from "../lib/helpers/aquaImports.js";
import { initCli } from "../lib/lifeCycle.js";
import { initMarineCli } from "../lib/marineCli.js";

export default class Build extends BaseCommand<typeof Build> {
  static override description = `Build all application services, described in ${FLUENCE_CONFIG_FULL_FILE_NAME} and generate aqua interfaces for them`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    ...MARINE_BUILD_ARGS_FLAG,
    ...IMPORT_FLAG,
  };
  async run(): Promise<void> {
    const { fluenceConfig, flags } = await initCli(
      this,
      await this.parse(Build),
      true,
    );

    const marineCli = await initMarineCli(fluenceConfig);

    await build({
      fluenceConfig,
      marineCli,
      marineBuildArgs: flags["marine-build-args"],
    });

    const workerConfig = await initNewWorkersConfig();

    const { ensureAquaFileWithWorkerInfo } = await import(
      "../lib/deployWorkers.js"
    );

    const aquaImports = await ensureAquaImports({
      maybeFluenceConfig: fluenceConfig,
      flags,
    });

    await ensureAquaFileWithWorkerInfo(workerConfig, fluenceConfig);
    await compileSpells(fluenceConfig, aquaImports);
    commandObj.logToStderr(`All services and spells built successfully`);
  }
}
