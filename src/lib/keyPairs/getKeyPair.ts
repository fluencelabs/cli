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

import fsPromises from "node:fs/promises";

import color from "@oclif/color";

import { initReadonlyProjectSecretsConfig } from "../configs/projectConfigs/projectSecretsConfig";
import { initReadonlyUserSecretsConfig } from "../configs/userConfigs/userSecretsConfig";
import { CommandObj, KEY_PAIR_NAME_FLAG } from "../const";
import { getProjectDotFluenceDir } from "../pathsGetters/getProjectDotFluenceDir";
import { list } from "../prompt";

import type { ConfigKeyPair } from "./generateKeyPair";

type GetUserKeyPairOptions = {
  commandObj: CommandObj;
  keyPairName?: string | undefined;
};

const getUserKeyPair = async ({
  commandObj,
  keyPairName,
}: GetUserKeyPairOptions): Promise<ConfigKeyPair | Error> => {
  const userSecretsConfig = await initReadonlyUserSecretsConfig(commandObj);

  if (
    keyPairName === undefined ||
    keyPairName === userSecretsConfig.defaultKeyPair.name
  ) {
    return userSecretsConfig.defaultKeyPair;
  }

  const keyPair = userSecretsConfig.keyPairs.find(
    ({ name }): boolean => name === keyPairName
  );

  if (keyPair !== undefined) {
    return keyPair;
  }

  commandObj.warn(`No user key-pair ${color.yellow(keyPairName)} found`);

  return list({
    message: "Select existing key-pair name",
    choices: [
      userSecretsConfig.defaultKeyPair,
      ...userSecretsConfig.keyPairs,
    ].map((value): { value: ConfigKeyPair; name: string } => ({
      value,
      name: value.name,
    })),
    oneChoiceMessage: (name): string => `Do you want to use ${name} key-pair`,
    onNoChoices: (): never =>
      commandObj.error(
        "There are no other key-pairs. You need a key-pair to continue"
      ),
  });
};

type GetKeyPairOptions = {
  commandObj: CommandObj;
  keyPairName: string | undefined;
};

const getProjectKeyPair = async ({
  commandObj,
  keyPairName,
}: GetKeyPairOptions): Promise<ConfigKeyPair | undefined> => {
  const projectSecretsConfig = await initReadonlyProjectSecretsConfig(
    commandObj
  );

  if (
    keyPairName === undefined ||
    keyPairName === projectSecretsConfig.defaultKeyPair?.name
  ) {
    return projectSecretsConfig.defaultKeyPair;
  }

  return projectSecretsConfig.keyPairs.find(
    ({ name }): boolean => name === keyPairName
  );
};

export const getKeyPair = async (
  options: GetKeyPairOptions
): Promise<ConfigKeyPair | Error> => {
  const projectDotFluenceDir = getProjectDotFluenceDir();

  try {
    await fsPromises.access(projectDotFluenceDir);
    const projectKeyPair = await getProjectKeyPair(options);
    if (projectKeyPair !== undefined) {
      return projectKeyPair;
    }
  } catch {}

  return getUserKeyPair(options);
};

export const getKeyPairFromFlags = async (
  {
    [KEY_PAIR_NAME_FLAG]: keyPairName,
  }: {
    [KEY_PAIR_NAME_FLAG]: string | undefined;
  },
  commandObj: CommandObj
): Promise<ConfigKeyPair | Error> => getKeyPair({ commandObj, keyPairName });
