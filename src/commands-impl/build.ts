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

import type Build from "../commands/build.js";
import { build } from "../lib/build.js";
import { initNewWorkersConfig } from "../lib/configs/project/workers.js";
import { ensureAquaFileWithWorkerInfo } from "../lib/deployWorkers.js";
import { initCli } from "../lib/lifeCycle.js";
import { initMarineCli } from "../lib/marineCli.js";

export async function buildImpl(
  this: Build,
  command: typeof Build,
): Promise<void> {
  const { fluenceConfig, flags } = await initCli(
    this,
    await this.parse(command),
    true,
  );

  const marineCli = await initMarineCli(fluenceConfig);

  await build({
    fluenceConfig,
    marineCli,
    marineBuildArgs: flags["marine-build-args"],
  });

  const workerConfig = await initNewWorkersConfig();
  await ensureAquaFileWithWorkerInfo(workerConfig, fluenceConfig);
}
