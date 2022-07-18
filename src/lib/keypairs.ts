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

import { KeyPair } from "@fluencelabs/fluence";
import color from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import { Separator } from "inquirer";

import { initReadonlyProjectSecretsConfig } from "./configs/project/projectSecrets";
import { initReadonlyUserSecretsConfig } from "./configs/user/userSecrets";
import { CommandObj, KEY_PAIR_FLAG_NAME } from "./const";
import { list, Choices } from "./prompt";

type GetUserKeyPairOptions = {
  commandObj: CommandObj;
  isInteractive: boolean;
  keyPairName?: string | undefined;
};

const getUserKeyPair = async ({
  commandObj,
  keyPairName,
  isInteractive,
}: GetUserKeyPairOptions): Promise<ConfigKeyPair> => {
  const userSecretsConfig = await initReadonlyUserSecretsConfig(commandObj);

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

  if (keyPair !== undefined) {
    return keyPair;
  }

  const noUserKeyPairMessage = `No key-pair ${color.yellow(keyPairName)} found`;

  if (!isInteractive) {
    commandObj.error(noUserKeyPairMessage);
  }
  commandObj.warn(noUserKeyPairMessage);

  const readonlyProjectSecretsConfig = await initReadonlyProjectSecretsConfig(
    commandObj
  );

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
    options.push(new Separator("Project key-pairs:"), ...projectKeyPairOptions);
  }

  if (userKeyPairOptions.length > 0) {
    options.push(new Separator("User key-pairs:"), ...userKeyPairOptions);
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
    isInteractive,
  });
};

type GetKeyPairOptions = {
  commandObj: CommandObj;
  isInteractive: boolean;
  keyPairName: string | undefined;
};

const getProjectKeyPair = async ({
  commandObj,
  keyPairName,
}: GetKeyPairOptions): Promise<ConfigKeyPair | undefined> => {
  const projectSecretsConfig = await initReadonlyProjectSecretsConfig(
    commandObj
  );

  if (keyPairName === undefined) {
    return projectSecretsConfig.keyPairs.find(
      ({ name }): boolean => name === projectSecretsConfig.defaultKeyPairName
    );
  }

  return projectSecretsConfig.keyPairs.find(
    ({ name }): boolean => name === keyPairName
  );
};

export const getKeyPair = async (
  options: GetKeyPairOptions
): Promise<ConfigKeyPair> =>
  (await getProjectKeyPair(options)) ?? getUserKeyPair(options);

export const getKeyPairFromFlags = async (
  {
    [KEY_PAIR_FLAG_NAME]: keyPairName,
  }: {
    [KEY_PAIR_FLAG_NAME]: string | undefined;
  },
  commandObj: CommandObj,
  isInteractive: boolean
): Promise<ConfigKeyPair | Error> =>
  getKeyPair({ commandObj, keyPairName, isInteractive });

export type ConfigKeyPair = {
  peerId: string;
  secretKey: string;
  publicKey: string;
  name: string;
};

export const configKeyPairSchema: JSONSchemaType<ConfigKeyPair> = {
  type: "object",
  properties: {
    peerId: { type: "string" },
    secretKey: { type: "string" },
    publicKey: { type: "string" },
    name: { type: "string" },
  },
  required: ["peerId", "secretKey", "publicKey", "name"],
};

export const generateKeyPair = async (name: string): Promise<ConfigKeyPair> => {
  const keyPair = await KeyPair.randomEd25519();
  return {
    peerId: keyPair.Libp2pPeerId.toB58String(),
    secretKey: Buffer.from(keyPair.toEd25519PrivateKey()).toString("base64"),
    publicKey: Buffer.from(keyPair.Libp2pPeerId.pubKey.bytes).toString(
      "base64"
    ),
    name,
  };
};
