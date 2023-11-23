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

import { access, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, parse, relative } from "node:path";

import { color } from "@oclif/color";

import { commandObj, isInteractive } from "./commandObj.js";
import { userConfig } from "./configs/globalConfigs.js";
import {
  initReadonlyFluenceConfig,
  type FluenceConfig,
} from "./configs/project/fluence.js";
import type { UserConfig } from "./configs/user/config.js";
import { FS_OPTIONS } from "./const.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import {
  ensureUserFluenceSecretsDir,
  getFluenceSecretsDir,
  getSecretsPathForWriting,
  getSecretsPathForReading,
  ensureFluenceSecretsDir,
  getFluenceDir,
} from "./paths.js";
import { list, type Choices, input, confirm } from "./prompt.js";

type UpdateSecretKeyArg = {
  name: string | undefined;
  isUser: boolean;
  maybeFluenceConfig: FluenceConfig | null;
};

type ResolveUserOrProjectConfigArgs = {
  isUser: boolean;
  maybeFluenceConfig: FluenceConfig | null;
};

async function resolveUserOrProjectConfig({
  isUser,
  maybeFluenceConfig,
}: ResolveUserOrProjectConfigArgs): Promise<UserConfig | FluenceConfig> {
  if (isUser) {
    return userConfig;
  }

  if (maybeFluenceConfig !== null) {
    return maybeFluenceConfig;
  }

  return ensureFluenceProject();
}

type WriteSecretKeyArg = {
  name: string;
  isUser: boolean;
  secretKey: string;
};

export async function writeSecretKey({
  isUser,
  name,
  secretKey,
}: WriteSecretKeyArg) {
  const secretsPath = await getSecretsPathForWriting(isUser);
  await writeFile(join(secretsPath, `${name}.txt`), secretKey, FS_OPTIONS);
}

export async function createSecretKey({
  name,
  isUser,
  maybeFluenceConfig,
  askToSetKeyAsDefaultInteractively = true,
}: UpdateSecretKeyArg & { askToSetKeyAsDefaultInteractively?: boolean }) {
  const userOrProjectConfig = await resolveUserOrProjectConfig({
    isUser,
    maybeFluenceConfig,
  });

  const secretsPath = await getSecretsPathForWriting(isUser);
  const secrets = await getSecretKeys(isUser);

  function validate(name: string | undefined) {
    if (name === undefined) {
      return `You have to enter secret key name to generate at ${secretsPath}`;
    }

    if (name in secrets) {
      return `Secret key ${color.yellow(
        name,
      )} already exists at ${secretsPath}`;
    }

    return true;
  }

  function promptSecretKeyName() {
    return input({
      message: `Enter secret key name to generate at ${secretsPath}`,
      validate,
    });
  }

  let secretKeyNameToUse = name ?? (await promptSecretKeyName());
  const keyNameValidity = validate(secretKeyNameToUse);

  if (keyNameValidity !== true) {
    if (!isInteractive) {
      commandObj.error(keyNameValidity);
    }

    commandObj.warn(keyNameValidity);

    secretKeyNameToUse = await promptSecretKeyName();
  }

  await writeSecretKey({
    isUser,
    name: secretKeyNameToUse,
    secretKey: await genSecretKeyString(),
  });

  if (
    askToSetKeyAsDefaultInteractively &&
    isInteractive &&
    (await confirm({
      message: `Do you want to set ${color.yellow(
        secretKeyNameToUse,
      )} as default secret key at ${userOrProjectConfig.$getPath()}`,
    }))
  ) {
    userOrProjectConfig.defaultSecretKeyName = secretKeyNameToUse;
    await userOrProjectConfig.$commit();
  }

  commandObj.logToStderr(
    `Secret key with name ${color.yellow(
      secretKeyNameToUse,
    )} successfully generated and saved to ${secretsPath}`,
  );
}

export async function removeSecretKey({
  name,
  isUser,
  maybeFluenceConfig,
}: UpdateSecretKeyArg) {
  const userOrProjectConfig = await resolveUserOrProjectConfig({
    isUser,
    maybeFluenceConfig,
  });

  const secretsPath = isUser
    ? getFluenceSecretsDir()
    : await ensureUserFluenceSecretsDir();

  const secrets = await getSecretKeys(isUser);

  if (isUser && Object.keys(secrets).length === 1) {
    commandObj.error(
      `There is only one secret key in ${secretsPath} and it can't be removed, because having at least one user's secret key is required.`,
    );
  }

  function validate(name: string) {
    if (!(name in secrets)) {
      return `Secret key ${color.yellow(
        name,
      )} doesn't exists at ${secretsPath}`;
    }

    return true;
  }

  function promptSecretKeyName() {
    return list({
      message: "Select secret key name to remove",
      options: Object.keys(secrets),
      oneChoiceMessage(choice) {
        return `Do you want to remove ${color.yellow(choice)}`;
      },
      onNoChoices() {
        return commandObj.error(
          `There are no secret keys to remove at ${secretsPath}`,
        );
      },
    });
  }

  let secretKeyNameToUse = name ?? (await promptSecretKeyName());
  const keyNameValidity = validate(secretKeyNameToUse);

  if (keyNameValidity !== true) {
    if (!isInteractive) {
      commandObj.error(keyNameValidity);
    }

    commandObj.warn(keyNameValidity);
    secretKeyNameToUse = await promptSecretKeyName();
  }

  await rm(join(secretsPath, `${secretKeyNameToUse}.txt`));

  commandObj.logToStderr(
    `Secret key with name ${color.yellow(
      secretKeyNameToUse,
    )} successfully removed from ${secretsPath}`,
  );

  if (userOrProjectConfig.defaultSecretKeyName !== secretKeyNameToUse) {
    return;
  }

  if (!isUser) {
    delete userOrProjectConfig.defaultSecretKeyName;
    await userOrProjectConfig.$commit();
  }

  if (!isInteractive) {
    if (isUser) {
      commandObj.warn(
        `Please set another default secret key manually at ${userOrProjectConfig.$getPath()}`,
      );
    }

    return;
  }

  const options = Object.keys(secrets).filter((key) => {
    return key !== secretKeyNameToUse;
  });

  const needToSelectNewDefault =
    isUser ||
    (options.length > 0 &&
      (await confirm({
        message: `Do you want to set another secret key as default at ${userOrProjectConfig.$getPath()}`,
      })));

  if (!needToSelectNewDefault) {
    return;
  }

  await setDefaultSecretKey({
    isUser,
    maybeFluenceConfig,
    name,
  });
}

export async function setDefaultSecretKey({
  name,
  isUser,
  maybeFluenceConfig,
}: UpdateSecretKeyArg) {
  const userOrProjectConfig = await resolveUserOrProjectConfig({
    isUser,
    maybeFluenceConfig,
  });

  const secretsPath = isUser
    ? getFluenceSecretsDir()
    : await ensureUserFluenceSecretsDir();

  const secrets = await getSecretKeys(isUser);

  function validate(name: string) {
    if (!(name in secrets)) {
      return `Secret key ${color.yellow(
        name,
      )} doesn't exists at ${secretsPath}`;
    }

    return true;
  }

  function promptSecretKeyName() {
    return list({
      message: "Select new default secret key",
      options: Object.keys(secrets),
      oneChoiceMessage(choice) {
        return `Do you want to set ${color.yellow(choice)} as default`;
      },
      onNoChoices() {
        return commandObj.error(
          `There are no secret keys to set as default at ${secretsPath}`,
        );
      },
    });
  }

  let secretKeyNameToUse = name ?? (await promptSecretKeyName());
  const keyNameValidity = validate(secretKeyNameToUse);

  if (keyNameValidity !== true) {
    if (!isInteractive) {
      commandObj.error(keyNameValidity);
    }

    commandObj.warn(keyNameValidity);
    secretKeyNameToUse = await promptSecretKeyName();
  }

  userOrProjectConfig.defaultSecretKeyName = secretKeyNameToUse;
  await userOrProjectConfig.$commit();

  commandObj.logToStderr(
    `Secret key with name ${color.yellow(
      secretKeyNameToUse,
    )} successfully set as default at ${userOrProjectConfig.$getPath()}`,
  );
}

export async function getUserSecretKey(
  secretKeyName: string | undefined,
): Promise<string | undefined> {
  const userSecrets = await getUserSecretKeys();
  return userSecrets[secretKeyName ?? userConfig.defaultSecretKeyName];
}

export async function getProjectSecretKey(
  secretKeyName: string | undefined,
): Promise<string | undefined> {
  const fluenceConfig = await initReadonlyFluenceConfig();

  const secretKeyNameToUse =
    secretKeyName ?? fluenceConfig?.defaultSecretKeyName;

  if (secretKeyNameToUse === undefined) {
    return;
  }

  const secretKeys = await getProjectSecretKeys();
  return secretKeys[secretKeyNameToUse];
}

export async function getExistingSecretKey(
  secretKeyName: string | undefined,
): Promise<string> {
  const projectSecretKey = await getProjectSecretKey(secretKeyName);

  if (projectSecretKey !== undefined) {
    return projectSecretKey;
  }

  const userSecretKey = await getUserSecretKey(secretKeyName);

  if (userSecretKey !== undefined) {
    return userSecretKey;
  }

  const noUserKeyPairMessage = `Secret key ${color.yellow(
    secretKeyName,
  )} not found`;

  if (!isInteractive) {
    return commandObj.error(noUserKeyPairMessage);
  }

  commandObj.warn(noUserKeyPairMessage);

  const options: Choices<{ key: string }> = [];
  const projectSecretKeys = await getProjectSecretKeys();

  const projectKeyPairOptions = Object.entries(projectSecretKeys).map(
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

  const userSecrets = await getUserSecretKeys();

  const userKeyPairOptions = Object.entries(userSecrets).map(([name, key]) => {
    return { value: { key }, name };
  });

  const inquirer = (await import("inquirer")).default;

  options.push(
    new inquirer.Separator("User secret keys:"),
    ...userKeyPairOptions,
  );

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

async function getUserSecretKeys() {
  return getSecretKeys(true);
}

async function getProjectSecretKeys() {
  return getSecretKeys(false);
}

export async function getSecretKeys(
  isUser: boolean,
): Promise<Record<string, string>> {
  const dir = await getSecretsPathForReading(isUser);

  try {
    await access(dir);
  } catch {
    return {};
  }

  const dirContent = await readdir(dir);
  return Object.fromEntries(
    await Promise.all(
      dirContent.map(async (fileName) => {
        return [
          parse(fileName).name,
          await readFile(join(dir, fileName), FS_OPTIONS),
        ] as const;
      }),
    ),
  );
}

export async function getSecretKeyOrReturnExisting(name: string) {
  const fluenceDir = getFluenceDir();
  const secretsPath = await ensureFluenceSecretsDir();
  const filePath = join(secretsPath, `${name}.txt`);
  let secretKey;

  try {
    secretKey = await readFile(filePath, FS_OPTIONS);
  } catch {
    secretKey = await genSecretKeyString();
    await writeFile(filePath, secretKey, FS_OPTIONS);
  }

  return { name, path: relative(fluenceDir, filePath), secretKey } as const;
}

export async function genSecretKeyString(): Promise<string> {
  const { KeyPair } = await import("@fluencelabs/js-client");
  const keyPair = await KeyPair.randomEd25519();
  const privateKey = keyPair.toEd25519PrivateKey();
  return Buffer.from(privateKey).toString("base64");
}

export function base64ToUint8Array(base64: string) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
