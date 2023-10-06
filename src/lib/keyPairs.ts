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

import { color } from "@oclif/color";

import { commandObj, isInteractive } from "./commandObj.js";
import { initReadonlyProjectSecretsConfig } from "./configs/project/projectSecrets.js";
import { initReadonlyUserSecretsConfig } from "./configs/user/userSecrets.js";
import { list, type Choices } from "./prompt.js";

export async function getUserSecretKey(
  secretKeyName: string | undefined,
): Promise<string | undefined> {
  const userSecretsConfig = await initReadonlyUserSecretsConfig();

  return userSecretsConfig.secretKeys[
    secretKeyName ?? userSecretsConfig.defaultSecretKey
  ];
}

async function getExistingUserSecretKey(
  secretKeyName: string | undefined,
): Promise<string> {
  const keyPair = await getUserSecretKey(secretKeyName);

  if (keyPair !== undefined) {
    return keyPair;
  }

  const userSecretsConfig = await initReadonlyUserSecretsConfig();

  const noUserKeyPairMessage = `No key-pair ${color.yellow(
    secretKeyName,
  )} found`;

  if (!isInteractive) {
    return commandObj.error(noUserKeyPairMessage);
  }

  commandObj.warn(noUserKeyPairMessage);
  const readonlyProjectSecretsConfig = await initReadonlyProjectSecretsConfig();
  const options: Choices<{ key: string }> = [];

  const projectKeyPairOptions = Object.entries(
    readonlyProjectSecretsConfig?.secretKeys ?? {},
  ).map(([name, key]) => {
    return { value: { key }, name };
  });

  const userKeyPairOptions = Object.entries(userSecretsConfig.secretKeys).map(
    ([name, key]) => {
      return { value: { key }, name };
    },
  );

  if (projectKeyPairOptions.length > 0) {
    const inquirer = (await import("inquirer")).default;

    options.push(
      new inquirer.Separator("Project secret keys:"),
      ...projectKeyPairOptions,
    );
  }

  if (userKeyPairOptions.length > 0) {
    const inquirer = (await import("inquirer")).default;

    options.push(
      new inquirer.Separator("User secret keys:"),
      ...userKeyPairOptions,
    );
  }

  const { key } = await list({
    message: "Select existing secret key name",
    options,
    oneChoiceMessage: (name): string => {
      return `Do you want to use ${color.yellow(name)}`;
    },
    onNoChoices: (): never => {
      return commandObj.error(
        "There are no other secret keys. You need a secret key to continue",
      );
    },
  });

  return key;
}

export async function getProjectSecretKey(
  secretKeyName: string | undefined,
): Promise<string | undefined> {
  const projectSecretsConfig = await initReadonlyProjectSecretsConfig();
  const secretKeys = projectSecretsConfig?.secretKeys;

  const secretKeyNameToUse =
    secretKeyName ?? projectSecretsConfig?.defaultSecretKey;

  if (secretKeys === undefined || secretKeyNameToUse === undefined) {
    return;
  }

  return secretKeys[secretKeyNameToUse];
}

export async function getExistingSecretKey(
  secretKeyName: string | undefined,
): Promise<string> {
  return (
    (await getProjectSecretKey(secretKeyName)) ??
    getExistingUserSecretKey(secretKeyName)
  );
}
