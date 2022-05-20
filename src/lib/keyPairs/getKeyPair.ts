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

import path from "node:path";

import { getMaybeProjectSecretsConfig } from "../configs/projectSecretsConfig";
import { getUserSecretsConfig } from "../configs/userSecretsConfig";
import { getFluenceProjectDir, getUserFluenceDir } from "../getFluenceDir";
import {
  CommandObj,
  CONFIG_FILE_NAME,
  DEFAULT_KEY_PAIR_NAME_PROPERTY,
  KEY_PAIR_NAME_FLAG,
  SECRETS_FILE_NAME,
} from "../const";
import { getUserConfig } from "../configs/userConfig";
import { getProjectConfig } from "../configs/projectConfig";
import { list } from "../prompt";

import type { ConfigKeyPair } from "./generateKeyPair";

const getUserKeyPair = async (
  commandObj: CommandObj,
  keyPairName: string | undefined,
  isUsedForValidation = false
): Promise<ConfigKeyPair | Error> => {
  const fluenceDirPath = await getUserFluenceDir(commandObj);
  const userConfigResult = await getUserConfig(fluenceDirPath);

  if (userConfigResult instanceof Error) {
    return userConfigResult;
  }

  const [userConfig] = userConfigResult;

  const userSecretsConfigResult = await getUserSecretsConfig(fluenceDirPath);

  if (userSecretsConfigResult instanceof Error) {
    return userSecretsConfigResult;
  }

  const [userSecretsConfig] = userSecretsConfigResult;

  if (keyPairName === undefined) {
    const defaultSecretKeyName = userConfig[DEFAULT_KEY_PAIR_NAME_PROPERTY];
    const defaultSecret = userSecretsConfig.secrets.find(
      ({ name }): boolean => name === defaultSecretKeyName
    );
    if (defaultSecret !== undefined) {
      return defaultSecret;
    }

    return new Error(
      `No '${defaultSecretKeyName}' in ${path.join(
        fluenceDirPath,
        SECRETS_FILE_NAME
      )}. '${defaultSecretKeyName}' was configured in ${path.join(
        fluenceDirPath,
        CONFIG_FILE_NAME
      )} (${DEFAULT_KEY_PAIR_NAME_PROPERTY}: ${defaultSecretKeyName})`
    );
  }

  const secret = userSecretsConfig.secrets.find(
    ({ name }): boolean => name === keyPairName
  );

  if (secret !== undefined) {
    return secret;
  }

  const problemMessage = `No key-pair '${keyPairName}' found`;

  if (isUsedForValidation) {
    return new Error(problemMessage);
  }

  commandObj.warn(problemMessage);
  const existingKeyPairName = await list({
    message: "Select existing key-pair name:",
    choices: Object.keys(userSecretsConfig.secrets),
  });

  const keyPair = userSecretsConfig.secrets.find(
    ({ name }): boolean => name === existingKeyPairName
  );

  if (keyPair !== undefined) {
    return keyPair;
  }

  throw new Error("Unexpected error: can't get keypair");
};

export const getKeyPair = async (
  commandObj: CommandObj,
  keyPairName?: string
): Promise<ConfigKeyPair | Error> => {
  const fluenceProjectDir = await getFluenceProjectDir();

  if (fluenceProjectDir === null) {
    return getUserKeyPair(commandObj, keyPairName);
  }

  const projectConfigResult = await getProjectConfig(fluenceProjectDir);

  if (projectConfigResult instanceof Error) {
    return projectConfigResult;
  }

  const [projectConfig] = projectConfigResult;

  const projectSecretsConfigResult = await getMaybeProjectSecretsConfig(
    fluenceProjectDir
  );

  if (projectSecretsConfigResult instanceof Error) {
    return projectSecretsConfigResult;
  }

  const [projectSecretsConfig] = projectSecretsConfigResult;

  const defaultSecretKeyName = projectConfig[DEFAULT_KEY_PAIR_NAME_PROPERTY];
  if (keyPairName === undefined && defaultSecretKeyName !== undefined) {
    const defaultSecret = projectSecretsConfig?.secrets.find(
      ({ name }): boolean => name === defaultSecretKeyName
    );

    if (defaultSecret !== undefined) {
      return defaultSecret;
    }

    return new Error(
      `No '${defaultSecretKeyName}' in ${path.join(
        fluenceProjectDir,
        SECRETS_FILE_NAME
      )}. '${defaultSecretKeyName}' was configured in ${path.join(
        fluenceProjectDir,
        CONFIG_FILE_NAME
      )} (${DEFAULT_KEY_PAIR_NAME_PROPERTY}: ${defaultSecretKeyName})`
    );
  }

  const keyPair = projectSecretsConfig?.secrets.find(
    ({ name }): boolean => name === keyPairName
  );

  if (keyPair !== undefined) {
    return keyPair;
  }

  return getUserKeyPair(commandObj, keyPairName);
};

export const getKeyPairFromFlags = async (
  {
    [KEY_PAIR_NAME_FLAG]: keyPairName,
  }: {
    [KEY_PAIR_NAME_FLAG]: string | undefined;
  },
  commandObj: CommandObj
): Promise<ConfigKeyPair | Error> => getKeyPair(commandObj, keyPairName);
