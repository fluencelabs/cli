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
import { commandObj } from "../lib/commandObj.js";
import { compileAquaFromFluenceConfig } from "../lib/compileAquaAndWatch.js";
import { initNewWorkersConfigReadonly } from "../lib/configs/project/workers.js";
import {
  FLUENCE_CONFIG_FULL_FILE_NAME,
  MARINE_BUILD_ARGS_FLAG,
  IMPORT_FLAG,
  ENV_FLAG,
  ENV_FLAG_NAME,
} from "../lib/const.js";
import { prepareForDeploy } from "../lib/deployWorkers.js";
import { getAquaImports } from "../lib/helpers/aquaImports.js";
import { initCli } from "../lib/lifeCycle.js";
import { resolveFluenceEnv } from "../lib/multiaddres.js";

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

    const fluenceEnv = await resolveFluenceEnv(flags[ENV_FLAG_NAME]);

    await prepareForDeploy({
      flags: {
        ...flags,
        "no-build": false,
      },
      fluenceConfig,
      fluenceEnv,
      isBuildCheck: true,
    });

    const { ensureAquaFileWithWorkerInfo } = await import(
      "../lib/deployWorkers.js"
    );

    const workerConfig = await initNewWorkersConfigReadonly();
    await ensureAquaFileWithWorkerInfo(workerConfig, fluenceConfig, fluenceEnv);

    await compileAquaFromFluenceConfig({
      fluenceConfig,
      imports: await getAquaImports({
        aquaImportsFromFlags: flags.import,
        fluenceConfig,
      }),
    });

    commandObj.logToStderr(`All services and spells built successfully`);
  }
}
