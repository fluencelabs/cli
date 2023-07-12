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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { commandObj, isInteractive } from "../../lib/commandObj.js";
import { initProjectSecretsConfig } from "../../lib/configs/project/projectSecrets.js";
import { initUserSecretsConfig } from "../../lib/configs/user/userSecrets.js";
import {
  PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../lib/const.js";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject.js";
import { generateKeyPair } from "../../lib/helpers/generateKeyPair.js";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir.js";
import { getProjectKeyPair, getUserKeyPair } from "../../lib/keyPairs.js";
import { initCli } from "../../lib/lifeCycle.js";
import { confirm, input } from "../../lib/prompt.js";

export default class New extends BaseCommand<typeof New> {
  static override description = `Generate key-pair and store it in ${USER_SECRETS_CONFIG_FULL_FILE_NAME} or ${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    user: Flags.boolean({
      default: false,
      description:
        "Generate key-pair for current user instead of generating key-pair for current project",
    }),
    default: Flags.boolean({
      default: false,
      description: "Set new key-pair as default for current project or user",
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
      await this.parse(New)
    );

    if (!flags.user && maybeFluenceConfig === null) {
      await ensureFluenceProject();
    }

    const userSecretsConfig = await initUserSecretsConfig();
    const projectSecretsConfig = await initProjectSecretsConfig();

    const secretsConfigPath = replaceHomeDir(
      (flags.user ? userSecretsConfig : projectSecretsConfig).$getPath()
    );

    const enterKeyPairNameMessage = `Enter key-pair name to generate at ${secretsConfigPath}`;

    let keyPairName =
      args.name ??
      (await input({
        message: enterKeyPairNameMessage,
      }));

    const validateKeyPairName = async (
      keyPairName: string
    ): Promise<true | string> => {
      return (
        (flags.user
          ? await getUserKeyPair(keyPairName)
          : await getProjectKeyPair(keyPairName)) === undefined ||
        `Key-pair with name ${color.yellow(
          keyPairName
        )} already exists at ${secretsConfigPath}. Please, choose another name.`
      );
    };

    const keyPairValidationResult = await validateKeyPairName(keyPairName);

    if (keyPairValidationResult !== true) {
      commandObj.warn(keyPairValidationResult);

      keyPairName = await input({
        message: enterKeyPairNameMessage,
        validate: validateKeyPairName,
      });
    }

    const newKeyPair = generateKeyPair(keyPairName);

    if (flags.user) {
      userSecretsConfig.keyPairs.push(newKeyPair);
    } else {
      projectSecretsConfig.keyPairs.push(newKeyPair);
    }

    if (
      flags.default ||
      (isInteractive
        ? await confirm({
            message: `Do you want to set ${color.yellow(
              keyPairName
            )} as default key-pair for ${secretsConfigPath}`,
          })
        : false)
    ) {
      if (flags.user) {
        userSecretsConfig.defaultKeyPairName = newKeyPair.name;
      } else {
        projectSecretsConfig.defaultKeyPairName = newKeyPair.name;
      }
    }

    await (flags.user
      ? userSecretsConfig.$commit()
      : projectSecretsConfig.$commit());

    this.log(
      `Key-pair with name ${color.yellow(
        keyPairName
      )} successfully generated and saved to ${secretsConfigPath}`
    );
  }
}
