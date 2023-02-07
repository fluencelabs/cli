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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../baseCommand.js";
import { initAquaCli } from "../lib/aquaCli.js";
import { initAppConfig } from "../lib/configs/project/app.js";
import { initFluenceLockConfig } from "../lib/configs/project/fluenceLock.js";
import { TIMEOUT_FLAG } from "../lib/const.js";
import { replaceHomeDir } from "../lib/helpers/replaceHomeDir.js";
import { initCli } from "../lib/lifecyle.js";
import { confirm } from "../lib/prompt.js";
import { removeApp } from "../lib/removeApp.js";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = "Remove previously deployed config";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    relay: Flags.string({
      description: "Relay node multiaddr",
      helpValue: "<multiaddr>",
    }),
    ...TIMEOUT_FLAG,
  };
  async run(): Promise<void> {
    const { commandObj, flags, isInteractive, fluenceConfig } = await initCli(
      this,
      await this.parse(Remove),
      true
    );

    const appConfig = await initAppConfig(this);

    if (appConfig === null || Object.keys(appConfig.services).length === 0) {
      this.error(
        "Seems like project is not currently deployed. Nothing to remove"
      );
    }

    if (
      isInteractive && // when isInteractive is false - removeApp without asking
      !(await confirm({
        message: `Are you sure you want to remove app described in ${color.yellow(
          replaceHomeDir(appConfig.$getPath())
        )}?`,
        isInteractive,
      }))
    ) {
      this.error("Aborted");
    }

    const maybeFluenceLockConfig = await initFluenceLockConfig(this);

    const aquaCli = await initAquaCli(
      this,
      fluenceConfig,
      maybeFluenceLockConfig
    );

    await removeApp({
      appConfig,
      commandObj,
      timeout: flags.timeout,
      relay: flags.relay,
      isInteractive,
      aquaCli,
    });
  }
}
