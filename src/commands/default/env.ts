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

import { color } from "@oclif/color";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { setEnvConfig } from "../../lib/configs/globalConfigs.js";
import { initNewEnvConfig } from "../../lib/configs/project/env.js";
import { initNewWorkersConfigReadonly } from "../../lib/configs/project/workers.js";
import { ENV_ARG } from "../../lib/const.js";
import { ensureAquaFileWithWorkerInfo } from "../../lib/deployWorkers.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  ensureCustomAddrsAndPeerIds,
  updateRelaysJSON,
} from "../../lib/multiaddres.js";
import { ensureValidFluenceEnv } from "../../lib/resolveFluenceEnv.js";

export default class Env extends BaseCommand<typeof Env> {
  static override description = "Switch default Fluence Environment";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  static override args = {
    ...ENV_ARG,
  };
  async run(): Promise<void> {
    const { args, maybeFluenceConfig: fluenceConfig } = await initCli(
      this,
      await this.parse(Env),
    );

    const newEnvConfig = await initNewEnvConfig();
    setEnvConfig(newEnvConfig);
    const fluenceEnv = await ensureValidFluenceEnv(args.ENV);

    if (
      fluenceEnv === "custom" &&
      fluenceConfig?.customFluenceEnv === undefined
    ) {
      await ensureCustomAddrsAndPeerIds();
    }

    newEnvConfig.fluenceEnv = fluenceEnv;
    await newEnvConfig.$commit();

    if (fluenceConfig !== null) {
      const workersConfig = await initNewWorkersConfigReadonly();
      await updateRelaysJSON();

      await ensureAquaFileWithWorkerInfo(
        workersConfig,
        fluenceConfig,
        fluenceEnv,
      );
    }

    commandObj.log(
      `Successfully set default fluence environment to ${color.yellow(
        fluenceEnv,
      )}`,
    );
  }
}
