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

import { Args } from "@oclif/core";

import { BaseCommand } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import { initFluenceConfig } from "../../lib/configs/project/fluence.js";
import { PACKAGE_NAME_AND_VERSION_ARG_NAME } from "../../lib/const.js";
import { aliasesText } from "../../lib/helpers/aliasesText.js";
import { startSpinner, stopSpinner } from "../../lib/helpers/spinner.js";
import { initCli } from "../../lib/lifeCycle.js";
import { npmInstall, npmInstallAll } from "../../lib/npm.js";
import { ensureMarineAndMreplDependencies } from "../../lib/rust.js";

export default class Install extends BaseCommand<typeof Install> {
  static override hiddenAliases = ["dep:i"];
  static override description = `Install aqua project dependencies (currently npm is used under the hood for managing aqua dependencies)${aliasesText.apply(this)}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override args = {
    [PACKAGE_NAME_AND_VERSION_ARG_NAME]: Args.string({
      description:
        "Valid argument for npm install command. If this argument is omitted all project aqua dependencies will be installed and command will also make sure marine and mrepl are installed",
    }),
  };
  async run(): Promise<void> {
    const { args } = await initCli(this, await this.parse(Install));
    const fluenceConfig = await initFluenceConfig();

    const packageNameAndVersion = args[PACKAGE_NAME_AND_VERSION_ARG_NAME];

    if (packageNameAndVersion === undefined) {
      if (fluenceConfig !== null) {
        startSpinner("Installing aqua dependencies");
        await npmInstallAll();
        stopSpinner();
        commandObj.logToStderr("Aqua dependencies are successfully installed");
      }

      await ensureMarineAndMreplDependencies();
      return;
    }

    if (fluenceConfig === null) {
      commandObj.error(
        "Not a fluence project. Please init fluence project to install specific aqua dependencies",
      );
    }

    await npmInstall(packageNameAndVersion);
  }
}
