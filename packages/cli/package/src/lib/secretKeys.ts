/**
 * Fluence CLI
 * Copyright (C) 2024 Fluence DAO
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { rm } from "fs/promises";
import { join } from "path/posix";

import { color } from "@oclif/color";

import { commandObj, isInteractive } from "./commandObj.js";
import {
  type FluenceConfig,
  initFluenceConfig,
} from "./configs/project/fluence.js";
import {
  type UserConfig,
  getUserSecretKey,
  initNewUserConfig,
} from "./configs/user/config/config.js";
import { ensureFluenceProject } from "./helpers/ensureFluenceProject.js";
import {
  getUserSecretKeys,
  type UpdateSecretKeyArg,
  getSecretKeys,
  getProjectSecretKey,
  getProjectSecretKeys,
} from "./keyPairs.js";
import { ensureUserFluenceSecretsDir, getFluenceSecretsDir } from "./paths.js";
import { list, confirm, type Choices } from "./prompt.js";

export async function resolveUserOrProjectConfig(
  isUser: boolean,
): Promise<UserConfig | FluenceConfig> {
  if (isUser) {
    return initNewUserConfig();
  }

  const fluenceConfig = await initFluenceConfig();

  if (fluenceConfig !== null) {
    return fluenceConfig;
  }

  return ensureFluenceProject();
}

export async function removeSecretKey({ name, isUser }: UpdateSecretKeyArg) {
  const userOrProjectConfig = await resolveUserOrProjectConfig(isUser);

  const secretsPath = isUser
    ? await ensureUserFluenceSecretsDir()
    : getFluenceSecretsDir();

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

  await setDefaultSecretKey({ isUser, name });
}

export async function setDefaultSecretKey({
  name,
  isUser,
}: UpdateSecretKeyArg) {
  const userOrProjectConfig = await resolveUserOrProjectConfig(isUser);

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

  const { key } = await list<{ key: string }, never>({
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
