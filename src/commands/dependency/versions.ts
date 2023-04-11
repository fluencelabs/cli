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

import { yamlDiffPatch } from "yaml-diff-patch";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj } from "../../lib/commandObj.js";
import {
  fluenceCargoDependencies,
  fluenceNPMDependencies,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import { getNPMVersionsMap } from "../../lib/npm.js";
import { getCargoVersionsMap } from "../../lib/rust.js";
import CLIPackageJSON from "../../versions/cli.package.json" assert { type: "json" };
import JSClientPackageJSON from "../../versions/js-client.package.json" assert { type: "json" };

export default class Versions extends BaseCommand<typeof Versions> {
  static override aliases = ["dependency:v", "dep:v", "dep:versions"];
  static override description =
    "Get versions of all currently used dependencies";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
  };
  async run(): Promise<void> {
    const { maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Versions)
    );

    commandObj.log(
      yamlDiffPatch(
        "",
        {},
        {
          "npm dependencies that can be overridden with 'fluence dependency npm install <name>@<version>'":
            {
              ...getNPMVersionsMap(fluenceNPMDependencies),
              ...maybeFluenceConfig?.dependencies?.npm,
            },
          "cargo dependencies that can be overridden with 'fluence dependency cargo install <name>@<version>'":
            {
              ...getCargoVersionsMap(fluenceCargoDependencies),
              ...maybeFluenceConfig?.dependencies?.cargo,
            },
          "internal dependencies": filterOutNonFluenceDependencies(
            CLIPackageJSON.dependencies
          ),
          "js-client.node dependencies": filterOutNonFluenceDependencies(
            JSClientPackageJSON.dependencies
          ),
        }
      )
    );
  }
}

const filterOutNonFluenceDependencies = (
  dependencies: Record<string, string>
) =>
  Object.fromEntries(
    Object.entries(dependencies).filter(([dep]) =>
      dep.startsWith("@fluencelabs/")
    )
  );
