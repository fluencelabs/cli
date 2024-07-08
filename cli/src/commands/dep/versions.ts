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

import { Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import InternalAquaDependenciesPackageJSON from "../../cli-aqua-dependencies/package.json" assert { type: "json" };
import { commandObj } from "../../lib/commandObj.js";
import {
  CLI_NAME_FULL,
  CLI_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { initCli } from "../../lib/lifeCycle.js";
import {
  getRustToolchainToUse,
  resolveMarineAndMreplDependencies,
} from "../../lib/rust.js";
import CLIPackageJSON from "../../versions/cli.package.json" assert { type: "json" };
import JSClientPackageJSON from "../../versions/js-client.package.json" assert { type: "json" };
import { versions } from "../../versions.js";

export default class Versions extends BaseCommand<typeof Versions> {
  static override aliases = ["dep:v"];
  static override description =
    "Get versions of all cli dependencies, including aqua, marine, mrepl and internal";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    default: Flags.boolean({
      description:
        "Display default npm and cargo dependencies and their versions for current CLI version. Default npm dependencies are always available to be imported in Aqua",
    }),
  };
  async run(): Promise<void> {
    const { flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Versions),
    );

    const { yamlDiffPatch } = await import("yaml-diff-patch");

    if (flags.default) {
      commandObj.log(
        yamlDiffPatch(
          "",
          {},
          {
            "cli version": commandObj.config.version,
            [`default ${depInstallCommandExplanation}`]: versions.npm,
            [`default ${marineAndMreplExplanation}`]: {
              marine: versions.cargo.marine,
              mrepl: versions.cargo.mrepl,
            },
            "default rust toolchain": versions["rust-toolchain"],
          },
        ),
      );

      return;
    }

    const devDependencies = filterOutNonFluenceDependencies(
      CLIPackageJSON.devDependencies,
    );

    commandObj.log(
      yamlDiffPatch(
        "",
        {},
        {
          [`${CLI_NAME_FULL} version`]: commandObj.config.version,
          "nox version": versions["nox"],
          "rust toolchain": await getRustToolchainToUse(),
          [depInstallCommandExplanation]:
            maybeFluenceConfig === null
              ? versions.npm
              : maybeFluenceConfig.aquaDependencies,
          [marineAndMreplExplanation]: Object.fromEntries(
            await resolveMarineAndMreplDependencies(),
          ),
          "internal dependencies": filterOutNonFluenceDependencies(
            CLIPackageJSON.dependencies,
          ),
          ...(Object.keys(devDependencies).length === 0
            ? {}
            : {
                "dev dependencies": filterOutNonFluenceDependencies(
                  CLIPackageJSON.devDependencies,
                ),
              }),
          "internal aqua dependencies":
            InternalAquaDependenciesPackageJSON.dependencies,
          "js-client dependencies": filterOutNonFluenceDependencies(
            JSClientPackageJSON.dependencies,
          ),
        },
      ),
    );
  }
}

const filterOutNonFluenceDependencies = (
  dependencies: Record<string, string>,
) => {
  return Object.fromEntries(
    Object.entries(dependencies).filter(([dep]) => {
      return dep.startsWith("@fluencelabs/");
    }),
  );
};

const depInstallCommandExplanation = `aqua dependencies that you can install or update using '${CLI_NAME} dep i <name>@<version>'`;
const marineAndMreplExplanation = `marine and mrepl dependencies that can be overridden in ${FLUENCE_CONFIG_FULL_FILE_NAME} using marineVersion and mreplVersion properties`;
