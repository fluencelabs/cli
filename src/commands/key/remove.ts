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

import assert from "node:assert";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import { initNewProjectSecretsConfig } from "../../lib/configs/project/projectSecrets.js";
import { initUserSecretsConfig } from "../../lib/configs/user/userSecrets.js";
import {
  PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject.js";
import { getProjectKeyPair, getUserKeyPair } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";
import { list } from "../../lib/prompt.js";

export default class Remove extends BaseCommand<typeof Remove> {
  static override description = `Remove key-pair from ${USER_SECRETS_CONFIG_FULL_FILE_NAME} or ${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    user: Flags.boolean({
      default: false,
      description:
        "Remove key-pair from current user instead of removing key-pair from current project",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Key-pair name",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, maybeFluenceConfig } = await initCli(
      this,
      await this.parse(Remove),
    );

    if (!flags.user && maybeFluenceConfig === null) {
      await ensureFluenceProject();
    }

    const userSecretsConfig = await initUserSecretsConfig();
    const projectSecretsConfig = await initNewProjectSecretsConfig();

    const secretsConfigPath = (
      flags.user ? userSecretsConfig : projectSecretsConfig
    ).$getPath();

    let keyPairName = args.name;

    const validateKeyPairName = async (
      keyPairName: string | undefined,
    ): Promise<true | string> => {
      if (keyPairName === undefined) {
        return "Key-pair name must be selected";
      }

      return (
        (flags.user
          ? await getUserKeyPair(keyPairName)
          : await getProjectKeyPair(keyPairName)) !== undefined ||
        `Key-pair with name ${color.yellow(
          keyPairName,
        )} doesn't exists at ${secretsConfigPath}. Please, choose another name.`
      );
    };

    if (flags.user && userSecretsConfig.keyPairs.length === 1) {
      return commandObj.error(
        `There is only one key-pair in ${secretsConfigPath} and it can't be removed, because having at least one user's key-pair is required.`,
      );
    }

    const keyPairValidationResult = await validateKeyPairName(keyPairName);

    if (keyPairValidationResult !== true) {
      this.warn(keyPairValidationResult);

      keyPairName = await list({
        message: `Select key-pair name to remove at ${secretsConfigPath}`,
        oneChoiceMessage: (choice: string): string => {
          return `Do you want to remove ${color.yellow(choice)}?`;
        },
        onNoChoices: (): never => {
          return commandObj.error(
            `There are no key-pairs to remove at ${secretsConfigPath}`,
          );
        },
        options: (flags.user
          ? userSecretsConfig
          : projectSecretsConfig
        ).keyPairs.map((value): string => {
          return value.name;
        }),
      });
    }

    assert(typeof keyPairName === "string");

    if (flags.user) {
      userSecretsConfig.keyPairs = userSecretsConfig.keyPairs.filter(
        ({ name }): boolean => {
          return name !== keyPairName;
        },
      );

      if (keyPairName === userSecretsConfig.defaultKeyPairName) {
        if (isInteractive) {
          const newDefaultKeyPairName = await list({
            message: `Select new default key-pair name for user's secrets`,
            oneChoiceMessage: (choice: string): string => {
              return `Do you want to set ${color.yellow(
                choice,
              )} as default key-pair?`;
            },
            onNoChoices: (): never => {
              commandObj.error(
                "There are no key-pairs to set as default for user's secrets",
              );
            },
            options: userSecretsConfig.keyPairs.map((value): string => {
              return value.name;
            }),
          });

          assert(typeof newDefaultKeyPairName === "string");

          userSecretsConfig.defaultKeyPairName = newDefaultKeyPairName;
        } else {
          const newDefaultKeyPairName = userSecretsConfig.keyPairs[0]?.name;

          if (newDefaultKeyPairName === undefined) {
            throw new Error("Unreachable");
          }

          userSecretsConfig.defaultKeyPairName = newDefaultKeyPairName;
        }
      }

      await userSecretsConfig.$commit();
    } else {
      projectSecretsConfig.keyPairs = projectSecretsConfig.keyPairs.filter(
        ({ name }): boolean => {
          return name !== keyPairName;
        },
      );

      if (projectSecretsConfig.keyPairs.length === 0) {
        delete projectSecretsConfig.defaultKeyPairName;
      } else if (keyPairName === projectSecretsConfig.defaultKeyPairName) {
        if (isInteractive) {
          const newDefaultKeyPairName = await list({
            message: `Select new default key-pair name for project's secrets`,
            oneChoiceMessage: (choice: string): string => {
              return `Do you want to set ${color.yellow(
                choice,
              )} as default key-pair?`;
            },
            onNoChoices: (): never => {
              commandObj.error(
                "There are no key-pairs to set as default for project's secrets",
              );
            },
            options: projectSecretsConfig.keyPairs.map((value): string => {
              return value.name;
            }),
          });

          assert(typeof newDefaultKeyPairName === "string");

          projectSecretsConfig.defaultKeyPairName = newDefaultKeyPairName;
        } else {
          const newDefaultKeypairName = projectSecretsConfig.keyPairs[0]?.name;

          if (newDefaultKeypairName === undefined) {
            throw new Error("Unreachable");
          }

          projectSecretsConfig.defaultKeyPairName = newDefaultKeypairName;
        }
      }

      await projectSecretsConfig.$commit();
    }

    commandObj.log(
      `Key-pair with name ${color.yellow(
        keyPairName,
      )} successfully removed from ${secretsConfigPath}`,
    );
  }
}
