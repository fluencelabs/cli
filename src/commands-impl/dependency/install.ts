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

import type Install from "../../commands/dependency/install.js";
import { commandObj } from "../../lib/commandObj.js";
import { initCli } from "../../lib/lifeCycle.js";
import { installAllNPMDependencies } from "../../lib/npm.js";
import { installAllCargoDependencies } from "../../lib/rust.js";

export async function installImpl(
  this: Install,
  command: typeof Install,
): Promise<void> {
  const { flags, maybeFluenceConfig } = await initCli(
    this,
    await this.parse(command),
  );

  await installAllNPMDependencies({
    maybeFluenceConfig,
    force: flags.force,
  });

  await installAllCargoDependencies({
    maybeFluenceConfig,
    force: flags.force,
  });

  commandObj.logToStderr("cargo and npm dependencies successfully installed");
}
