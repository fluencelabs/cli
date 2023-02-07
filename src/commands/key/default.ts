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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Args, Flags } from "@oclif/core";

import { BaseCommand, baseFlags } from "../../baseCommand.js";
import { initProjectSecretsConfig } from "../../lib/configs/project/projectSecrets.js";
import { initUserSecretsConfig } from "../../lib/configs/user/userSecrets.js";
import { ensureFluenceProject } from "../../lib/helpers/ensureFluenceProject.js";
import { replaceHomeDir } from "../../lib/helpers/replaceHomeDir.js";
import { getProjectKeyPair, getUserKeyPair } from "../../lib/keypairs.js";
import { initCli } from "../../lib/lifecyle.js";
import { list } from "../../lib/prompt.js";

export default class Default extends BaseCommand<typeof Default> {
  static override description = "Set default key-pair for user or project";
  static override examples = ["<%= config.bin %> <%= command.id %>"];
  static override flags = {
    ...baseFlags,
    user: Flags.boolean({
      description:
        "Set default key-pair for current user instead of current project",
    }),
  };
  static override args = {
    name: Args.string({
      description: "Key-pair name",
    }),
  };
  async run(): Promise<void> {
    const { args, flags, isInteractive, commandObj, maybeFluenceConfig } =
      await initCli(this, await this.parse(Default));

    if (!flags.user && maybeFluenceConfig === null) {
      await ensureFluenceProject(commandObj, isInteractive);
    }

    const userSecretsConfig = await initUserSecretsConfig(this);
    const projectSecretsConfig = await initProjectSecretsConfig(this);

    const secretsConfigPath = replaceHomeDir(
      (flags.user ? userSecretsConfig : projectSecretsConfig).$getPath()
    );

    let keyPairName = args.name;

    const validateKeyPairName = async (
      keyPairName: string | undefined
    ): Promise<true | string> => {
      if (keyPairName === undefined) {
        return "Key-pair name must be selected";
      }

      return (
        (flags.user
          ? await getUserKeyPair({ commandObj, keyPairName })
          : await getProjectKeyPair({ commandObj, keyPairName })) !==
          undefined ||
        `Key-pair with name ${color.yellow(
          keyPairName
        )} doesn't exists at ${secretsConfigPath}. Please, choose another name.`
      );
    };

    const keyPairValidationResult = await validateKeyPairName(keyPairName);

    if (keyPairValidationResult !== true) {
      this.warn(keyPairValidationResult);

      keyPairName = await list({
        isInteractive,
        message: `Select key-pair name to set as default at ${secretsConfigPath}`,
        oneChoiceMessage: (choice: string): string =>
          `Do you want to set ${color.yellow(choice)} as default?`,
        onNoChoices: (): never =>
          this.error(
            `There are no key-pairs to set as default at ${secretsConfigPath}`
          ),
        options: (flags.user
          ? userSecretsConfig
          : projectSecretsConfig
        ).keyPairs.map((value): string => value.name),
      });
    }

    assert(typeof keyPairName === "string");

    if (flags.user) {
      userSecretsConfig.defaultKeyPairName = keyPairName;
      await userSecretsConfig.$commit();
    } else {
      projectSecretsConfig.defaultKeyPairName = keyPairName;
      await projectSecretsConfig.$commit();
    }

    this.log(
      `Key-pair with name ${color.yellow(
        keyPairName
      )} successfully set as default at ${secretsConfigPath}`
    );
  }
}
