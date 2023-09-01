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

import type Install from "../../../commands/dependency/npm/install.js";
import { commandObj } from "../../../lib/commandObj.js";
import {
  GLOBAL_FLAG_NAME,
  PACKAGE_NAME_AND_VERSION_ARG_NAME,
} from "../../../lib/const.js";
import { initCli } from "../../../lib/lifeCycle.js";
import {
  ensureNpmDependency,
  installAllNPMDependencies,
} from "../../../lib/npm.js";

export async function installImpl(
  this: Install,
  command: typeof Install,
): Promise<void> {
  const { args, flags, maybeFluenceConfig } = await initCli(
    this,
    await this.parse(command),
  );

  const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

  // if packageNameAndVersion not provided just install all npm dependencies
  if (packageNameAndVersion === undefined) {
    await installAllNPMDependencies({
      maybeFluenceConfig,
      force: flags.force,
    });

    return commandObj.log("npm dependencies successfully installed");
  }

  if (!flags.global && maybeFluenceConfig === null) {
    return commandObj.error(
      `Not a fluence project. If you wanted to install npm dependencies globally for the current user, use --${GLOBAL_FLAG_NAME} flag`,
    );
  }

  await ensureNpmDependency({
    nameAndVersion: packageNameAndVersion,
    maybeFluenceConfig,
    explicitInstallation: true,
    force: flags.force,
    global: flags.global,
  });
}
