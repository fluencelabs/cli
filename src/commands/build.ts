/**
 * Copyright 2022 Fluence Labs Limited
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

import color from "@oclif/color";

import { BaseCommand } from "../baseCommand";
import { build } from "../lib/build";
import { initFluenceLockConfig } from "../lib/configs/project/fluenceLock";
import { FLUENCE_CONFIG_FILE_NAME } from "../lib/const";
import { getExistingKeyPair } from "../lib/keypairs";
import { initCli } from "../lib/lifecyle";
import { initMarineCli } from "../lib/marineCli";

export default class Build extends BaseCommand<typeof Build> {
  static override description = `Build all application services, described in ${color.yellow(
    FLUENCE_CONFIG_FILE_NAME
  )}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  async run(): Promise<void> {
    const { isInteractive, commandObj, fluenceConfig } = await initCli(
      this,
      await this.parse(Build),
      true
    );

    const defaultKeyPair = await getExistingKeyPair({
      keyPairName: fluenceConfig.keyPairName,
      commandObj,
      isInteractive,
    });

    if (defaultKeyPair instanceof Error) {
      this.error(defaultKeyPair.message);
    }

    const maybeFluenceLockConfig = await initFluenceLockConfig(this);

    const marineCli = await initMarineCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    await build({
      fluenceConfig,
      defaultKeyPair,
      isInteractive,
      marineCli,
      commandObj,
    });
  }
}
