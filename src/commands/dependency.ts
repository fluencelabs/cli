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
import { Command, Flags } from "@oclif/core";

import { initAquaCli } from "../lib/aquaCli";
import {
  AQUA_NPM_DEPENDENCY,
  dependencyList,
  initDependencyConfig,
  initReadonlyDependencyConfig,
  isDependency,
} from "../lib/configs/user/dependency";
import { FLUENCE_DIR_NAME, NO_INPUT_FLAG } from "../lib/const";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { usage } from "../lib/helpers/usage";
import { npmDependencies } from "../lib/npm";
import { confirm, input, list } from "../lib/prompt";

const NAME = "NAME";
const RECOMMENDED = "recommended";
const VERSION_FLAG_NAME = "version";
const USE_FLAG_NAME = "use";

export default class Dependency extends Command {
  static override description = `Manage dependencies stored inside ${FLUENCE_DIR_NAME} directory of the current user`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    version: Flags.boolean({
      char: "v",
      description: "Show current version of the dependency",
      exclusive: [USE_FLAG_NAME],
    }),
    use: Flags.string({
      description: `Set version of the dependency that you want to use. Use ${color.yellow(
        RECOMMENDED
      )} keyword if you want to use ${RECOMMENDED} version`,
      helpValue: `<version | ${RECOMMENDED}>`,
      exclusive: [VERSION_FLAG_NAME],
    }),
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: NAME,
      description: `Dependency name. Currently the only dependency is ${color.yellow(
        AQUA_NPM_DEPENDENCY
      )}`,
    },
  ];
  static override usage: string = usage(this);
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Dependency);
    const isInteractive = getIsInteractive(flags);
    let name: unknown = args[NAME];

    if (name === undefined) {
      if (flags.use === RECOMMENDED) {
        const resetAllDependencies = await confirm({
          isInteractive,
          message: `Do you want to reset all dependencies to their ${color.yellow(
            RECOMMENDED
          )} versions`,
        });

        if (resetAllDependencies) {
          const dependencyConfig = await initDependencyConfig(this);
          dependencyConfig.dependency = {};
          await dependencyConfig.$commit();
          this.log(
            `Successfully reset all dependencies to their ${color.yellow(
              RECOMMENDED
            )} versions`
          );
          return;
        }
      }

      name = await list({
        isInteractive,
        message: "Select dependency",
        oneChoiceMessage: (name): string =>
          `Do you want to manage ${color.yellow(name)}`,
        onNoChoices: (): void =>
          this.error("You have to select dependency to manage"),
        options: [...dependencyList],
      });
    }

    if (!isDependency(name)) {
      this.error(`Unknown dependency ${color.yellow(name)}`);
    }

    const dependencyName = name;
    const { recommendedVersion, packageName } = npmDependencies[dependencyName];

    const handleVersion = async (): Promise<void> => {
      const result =
        (await initReadonlyDependencyConfig(this)).dependency?.[
          dependencyName
        ] ?? recommendedVersion;

      this.log(
        `Using version ${color.yellow(result)}${
          result.includes(recommendedVersion) ? ` (${RECOMMENDED})` : ""
        } of ${packageName}`
      );
    };

    if (flags.version === true) {
      return handleVersion();
    }

    const handleUse = async (version: string): Promise<void> => {
      const dependencyConfig = await initDependencyConfig(this);
      if (dependencyConfig.dependency === undefined) {
        if (version !== RECOMMENDED) {
          dependencyConfig.dependency = {
            [dependencyName]: version,
          };
        }
      } else if (version === RECOMMENDED) {
        delete dependencyConfig.dependency[dependencyName];
        if (Object.keys(dependencyConfig.dependency).length === 0) {
          delete dependencyConfig.dependency;
        }
      } else {
        dependencyConfig.dependency[dependencyName] = version;
      }

      switch (dependencyName) {
        case "aqua": {
          await initAquaCli(this);
          break;
        }
        default: {
          const _exhaustiveCheck: never = dependencyName;
          return _exhaustiveCheck;
        }
      }

      await dependencyConfig.$commit();
      await handleVersion();
    };

    if (typeof flags.use === "string") {
      return handleUse(flags.use);
    }

    return (
      await list({
        isInteractive,
        message: "Select action",
        oneChoiceMessage: (): never => {
          this.error("Unreachable");
        },
        onNoChoices: (): never => this.error("Unreachable"),
        options: [
          {
            value: handleVersion,
            name: `Print version of ${color.yellow(name)}`,
          },
          {
            value: async (): Promise<void> =>
              handleUse(
                await input({
                  isInteractive,
                  message: `Enter version of ${color.yellow(
                    name
                  )} that you want to use`,
                })
              ),
            name: `Set version of ${color.yellow(name)} that you want to use`,
          },
        ],
      })
    )();
  }
}
