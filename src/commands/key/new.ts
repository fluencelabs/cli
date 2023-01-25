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

import assert from "node:assert";

import color from "@oclif/color";
import { Flags } from "@oclif/core";

import { BaseCommand } from "../../baseCommand";
import { initProjectSecretsConfig } from "../../lib/configs/project/projectSecrets";
import { initUserSecretsConfig } from "../../lib/configs/user/userSecrets";
import {
  NAME_FLAG_NAME,
  PROJECT_SECRETS_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FILE_NAME,
} from "../../lib/const";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject";
import { generateKeyPair } from "../../lib/helpers/generateKeyPair";
import { getArg } from "../../lib/helpers/getArg";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir";
import { getProjectKeyPair, getUserKeyPair } from "../../lib/keypairs";
import { initCli } from "../../lib/lifecyle";
import { confirm, input } from "../../lib/prompt";

export default class New extends BaseCommand<typeof New> {
  static override description = `Generate key-pair and store it in ${USER_SECRETS_CONFIG_FILE_NAME} or ${PROJECT_SECRETS_CONFIG_FILE_NAME}`;
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    user: Flags.boolean({
      description:
        "Generate key-pair for current user instead of generating key-pair for current project",
    }),
  };
  static override args = {
    [NAME_FLAG_NAME]: getArg(NAME_FLAG_NAME, "Key-pair name"),
  };
  async run(): Promise<void> {
    const { args, flags, isInteractive, commandObj, maybeFluenceConfig } =
      await initCli(this, await this.parse(New));

    if (!flags.user && maybeFluenceConfig === null) {
      await ensureFluenceProject(commandObj, isInteractive);
    }

    const userSecretsConfig = await initUserSecretsConfig(this);
    const projectSecretsConfig = await initProjectSecretsConfig(this);

    const secretsConfigPath = replaceHomeDir(
      (flags.user ? userSecretsConfig : projectSecretsConfig).$getPath()
    );

    const enterKeyPairNameMessage = `Enter key-pair name to generate at ${secretsConfigPath}`;

    let keyPairName =
      args[NAME_FLAG_NAME] ??
      (await input({
        isInteractive,
        message: enterKeyPairNameMessage,
      }));

    assert(typeof keyPairName === "string");

    const validateKeyPairName = async (
      keyPairName: string
    ): Promise<true | string> =>
      (flags.user
        ? await getUserKeyPair({ commandObj, keyPairName })
        : await getProjectKeyPair({ commandObj, keyPairName })) === undefined ||
      `Key-pair with name ${color.yellow(
        keyPairName
      )} already exists at ${secretsConfigPath}. Please, choose another name.`;

    const keyPairValidationResult = await validateKeyPairName(keyPairName);

    if (keyPairValidationResult !== true) {
      this.warn(keyPairValidationResult);

      keyPairName = await input({
        isInteractive,
        message: enterKeyPairNameMessage,
        validate: validateKeyPairName,
      });
    }

    const newKeyPair = await generateKeyPair(keyPairName);

    if (flags.user) {
      userSecretsConfig.keyPairs.push(newKeyPair);
    } else {
      projectSecretsConfig.keyPairs.push(newKeyPair);
    }

    if (
      isInteractive
        ? await confirm({
            isInteractive,
            message: `Do you want to set ${color.yellow(
              keyPairName
            )} as default key-pair for ${secretsConfigPath}`,
          })
        : false
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
