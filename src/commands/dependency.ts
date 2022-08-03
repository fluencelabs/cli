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
import { Separator } from "inquirer";

import {
  dependencyList,
  DependencyName,
  initDependencyConfig,
  initReadonlyDependencyConfig,
  isDependency,
} from "../lib/configs/user/dependency";
import {
  AQUA_NPM_DEPENDENCY,
  cargoDependencyList,
  CARGO_GENERATE_CARGO_DEPENDENCY,
  CommandObj,
  FLUENCE_DIR_NAME,
  MARINE_CARGO_DEPENDENCY,
  MREPL_CARGO_DEPENDENCY,
  NO_INPUT_FLAG,
  npmDependencyList,
} from "../lib/const";
import { getIsInteractive } from "../lib/helpers/getIsInteractive";
import { ensureNpmDependency, npmDependencies } from "../lib/npm";
import { confirm, input, list } from "../lib/prompt";
import { cargoDependencies, ensureCargoDependency } from "../lib/rust";

const NAME = "NAME";
const RECOMMENDED = "recommended";
const VERSION_FLAG_NAME = "version";
const USE_FLAG_NAME = "use";

const RESET_ALL_MESSAGE = `If you omit ${color.yellow(
  NAME
)} argument and include ${color.yellow(
  `--${USE_FLAG_NAME} ${RECOMMENDED}`
)} - all dependencies will be reset to ${RECOMMENDED} versions`;

export default class Dependency extends Command {
  static override description = `Manage dependencies stored inside ${color.yellow(
    FLUENCE_DIR_NAME
  )} directory of the current user`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    version: Flags.boolean({
      char: "v",
      description: "Show current version of the dependency",
      exclusive: [USE_FLAG_NAME],
    }),
    use: Flags.string({
      description: `Set dependency version. Use ${color.yellow(
        RECOMMENDED
      )} keyword to set ${RECOMMENDED} version for the dependency. ${RESET_ALL_MESSAGE}`,
      helpValue: `<version | ${RECOMMENDED}>`,
      exclusive: [VERSION_FLAG_NAME],
    }),
    ...NO_INPUT_FLAG,
  };
  static override args = [
    {
      name: NAME,
      description: `Dependency name. One of: ${color.yellow(
        dependencyList.join(", ")
      )}. ${RESET_ALL_MESSAGE}`,
    },
  ];
  async run(): Promise<void> {
    const { args, flags } = await this.parse(Dependency);
    const isInteractive = getIsInteractive(flags);
    let name: unknown = args[NAME];

    if (
      name === undefined &&
      flags.use === RECOMMENDED &&
      (await confirm({
        isInteractive,
        message: `Do you want to reset all dependencies to ${color.yellow(
          RECOMMENDED
        )} versions`,
      }))
    ) {
      const dependencyConfig = await initDependencyConfig(this);
      dependencyConfig.dependency = {};
      await dependencyConfig.$commit();

      for (const dependencyName of dependencyList) {
        // eslint-disable-next-line no-await-in-loop
        await ensureDependency(dependencyName, this);
      }

      this.log(
        `Successfully reset all dependencies to ${color.yellow(
          RECOMMENDED
        )} versions`
      );

      return;
    }

    if (
      name === undefined ||
      (!isDependency(name) &&
        typeof this.warn(`Unknown dependency ${color.yellow(name)}`) ===
          "string")
    ) {
      name = await list({
        isInteractive,
        message: "Select dependency",
        oneChoiceMessage: (name): string =>
          `Do you want to manage ${color.yellow(name)}`,
        onNoChoices: (): void =>
          this.error("You have to select dependency to manage"),
        options: [
          new Separator("NPM dependencies:"),
          ...npmDependencyList,
          new Separator("Cargo dependencies:"),
          ...cargoDependencyList,
        ],
      });
    }

    if (!isDependency(name)) {
      this.error("Unreachable");
    }

    const dependencyName = name;

    const { recommendedVersion, packageName } = {
      ...npmDependencies,
      ...cargoDependencies,
    }[dependencyName];

    if (flags.version === true) {
      return handleVersion({
        commandObj: this,
        dependencyName,
        packageName,
        recommendedVersion,
      });
    }

    if (typeof flags.use === "string") {
      return handleUse({
        commandObj: this,
        dependencyName,
        packageName,
        recommendedVersion,
        version: flags.use,
      });
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
            value: (): Promise<void> =>
              handleVersion({
                commandObj: this,
                dependencyName,
                packageName,
                recommendedVersion,
              }),
            name: `Print version of ${color.yellow(dependencyName)}`,
          },
          {
            value: async (): Promise<void> =>
              handleUse({
                commandObj: this,
                dependencyName,
                packageName,
                recommendedVersion,
                version: await input({
                  isInteractive,
                  message: `Enter version of ${color.yellow(
                    name
                  )} that you want to use`,
                }),
              }),
            name: `Set version of ${color.yellow(
              dependencyName
            )} that you want to use`,
          },
        ],
      })
    )();
  }
}

type HandleVersionArg = {
  recommendedVersion: string;
  dependencyName: DependencyName;
  packageName: string;
  commandObj: CommandObj;
};

const handleVersion = async ({
  recommendedVersion,
  dependencyName,
  packageName,
  commandObj,
}: HandleVersionArg): Promise<void> => {
  const result =
    (await initReadonlyDependencyConfig(commandObj)).dependency?.[
      dependencyName
    ] ?? recommendedVersion;

  commandObj.log(
    `Using version ${color.yellow(result)}${
      result.includes(recommendedVersion) ? ` (${RECOMMENDED})` : ""
    } of ${packageName}`
  );
};

const ensureDependency = async (
  dependencyName: DependencyName,
  commandObj: CommandObj
): Promise<void> => {
  switch (dependencyName) {
    case AQUA_NPM_DEPENDENCY: {
      await ensureNpmDependency({ name: dependencyName, commandObj });
      break;
    }
    case MARINE_CARGO_DEPENDENCY:
    case MREPL_CARGO_DEPENDENCY:
    case CARGO_GENERATE_CARGO_DEPENDENCY: {
      await ensureCargoDependency({
        name: dependencyName,
        commandObj,
      });

      break;
    }

    default: {
      const _exhaustiveCheck: never = dependencyName;
      return _exhaustiveCheck;
    }
  }
};

type HandleUseArg = HandleVersionArg & {
  version: string;
};

const handleUse = async ({
  recommendedVersion,
  dependencyName,
  packageName,
  commandObj,
  version,
}: HandleUseArg): Promise<void> => {
  const dependencyConfig = await initDependencyConfig(commandObj);

  const updatedDependencyVersionsConfig = {
    ...dependencyConfig.dependency,
    [dependencyName]: version === RECOMMENDED ? undefined : version,
  };

  const isConfigEmpty = Object.values(updatedDependencyVersionsConfig).every(
    (value): boolean => value === undefined
  );

  if (isConfigEmpty) {
    delete dependencyConfig.dependency;
  } else {
    dependencyConfig.dependency = updatedDependencyVersionsConfig;
  }

  await dependencyConfig.$commit();
  await ensureDependency(dependencyName, commandObj);
  return handleVersion({
    commandObj,
    dependencyName,
    packageName,
    recommendedVersion,
  });
};
