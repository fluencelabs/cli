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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import inquirer from "inquirer";

import { commandObj, isInteractive } from "./commandObj.js";
import type { ConfigKeyPair } from "./configs/keyPair.js";
import type { FluenceConfig } from "./configs/project/fluence.js";
import { initReadonlyProjectSecretsConfig } from "./configs/project/projectSecrets.js";
import { initReadonlyUserSecretsConfig } from "./configs/user/userSecrets.js";
import { KEY_PAIR_FLAG_NAME } from "./const.js";
import { list, Choices } from "./prompt.js";

export const getKeyPair = async (keyPairName: string | undefined) =>
  (await getProjectKeyPair(keyPairName)) ?? (await getUserKeyPair(keyPairName));

export const getUserKeyPair = async (
  keyPairName: string | undefined
): Promise<ConfigKeyPair | undefined> => {
  const userSecretsConfig = await initReadonlyUserSecretsConfig();

  if (keyPairName === undefined) {
    const defaultKeyPair = userSecretsConfig.keyPairs.find(
      ({ name }): boolean => name === userSecretsConfig.defaultKeyPairName
    );

    assert(defaultKeyPair !== undefined);
    return defaultKeyPair;
  }

  const keyPair = userSecretsConfig.keyPairs.find(
    ({ name }): boolean => name === keyPairName
  );

  return keyPair;
};

const getExistingUserKeyPair = async (
  keyPairName: string | undefined
): Promise<ConfigKeyPair> => {
  const keyPair = await getUserKeyPair(keyPairName);

  if (keyPair !== undefined) {
    return keyPair;
  }

  const userSecretsConfig = await initReadonlyUserSecretsConfig();

  const noUserKeyPairMessage = `No key-pair ${color.yellow(keyPairName)} found`;

  if (!isInteractive) {
    commandObj.error(noUserKeyPairMessage);
  }

  commandObj.warn(noUserKeyPairMessage);

  const readonlyProjectSecretsConfig = await initReadonlyProjectSecretsConfig();

  const options: Choices<ConfigKeyPair> = [];

  const projectKeyPairOptions = readonlyProjectSecretsConfig.keyPairs.map(
    (value): { value: ConfigKeyPair; name: string } => ({
      value,
      name: value.name,
    })
  );

  const userKeyPairOptions = userSecretsConfig.keyPairs.map(
    (value): { value: ConfigKeyPair; name: string } => ({
      value,
      name: value.name,
    })
  );

  if (projectKeyPairOptions.length > 0) {
    options.push(
      new inquirer.Separator("Project key-pairs:"),
      ...projectKeyPairOptions
    );
  }

  if (userKeyPairOptions.length > 0) {
    options.push(
      new inquirer.Separator("User key-pairs:"),
      ...userKeyPairOptions
    );
  }

  return list({
    message: "Select existing key-pair name",
    options,
    oneChoiceMessage: (name): string =>
      `Do you want to use ${color.yellow(name)}`,
    onNoChoices: (): never =>
      commandObj.error(
        "There are no other key-pairs. You need a key-pair to continue"
      ),
  });
};

export const getProjectKeyPair = async (
  keyPairName: string | undefined
): Promise<ConfigKeyPair | undefined> => {
  const projectSecretsConfig = await initReadonlyProjectSecretsConfig();

  if (keyPairName === undefined) {
    return projectSecretsConfig.keyPairs.find(
      ({ name }): boolean => name === projectSecretsConfig.defaultKeyPairName
    );
  }

  return projectSecretsConfig.keyPairs.find(
    ({ name }): boolean => name === keyPairName
  );
};

export const getExistingKeyPair = async (
  keyPairName: string | undefined
): Promise<ConfigKeyPair> =>
  (await getProjectKeyPair(keyPairName)) ?? getExistingUserKeyPair(keyPairName);

export const getExistingKeyPairFromFlags = async (
  {
    [KEY_PAIR_FLAG_NAME]: keyPairName,
  }: {
    [KEY_PAIR_FLAG_NAME]: string | undefined;
  },
  maybeFluenceConfig: FluenceConfig | null
): Promise<ConfigKeyPair | Error> =>
  getExistingKeyPair(keyPairName ?? maybeFluenceConfig?.keyPairName);
