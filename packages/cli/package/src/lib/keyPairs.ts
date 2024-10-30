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

import { access, readFile, readdir, writeFile } from "node:fs/promises";
import { join, parse, relative } from "node:path";

import { color } from "@oclif/color";

import { commandObj, isInteractive } from "./commandObj.js";
import {
  initReadonlyFluenceConfig,
  type FluenceConfig,
} from "./configs/project/fluence.js";
import type { UserConfig } from "./configs/user/config/config.js";
import { FS_OPTIONS } from "./const.js";
import { bufferToBase64 } from "./helpers/typesafeStringify.js";
import {
  getSecretsPathForWriting,
  getSecretsPathForReading,
  ensureFluenceSecretsFilePath,
  getFluenceDir,
} from "./paths.js";
import { input, confirm } from "./prompt.js";

export type UpdateSecretKeyArg = {
  name: string | undefined;
  isUser: boolean;
};

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
  userOrProjectConfig,
  askToSetKeyAsDefaultInteractively = true,
}: UpdateSecretKeyArg & {
  askToSetKeyAsDefaultInteractively?: boolean;
  userOrProjectConfig: UserConfig | FluenceConfig;
}) {
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

export async function getUserSecretKeys() {
  return getSecretKeys(true);
}

export async function getProjectSecretKeys() {
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

export async function genSecretKeyOrReturnExisting(name: string) {
  const fluenceDir = getFluenceDir();
  const filePath = await ensureFluenceSecretsFilePath(name);
  let secretKey;

  try {
    secretKey = await readFile(filePath, FS_OPTIONS);
  } catch {
    secretKey = await genSecretKeyString();
    await writeFile(filePath, secretKey, FS_OPTIONS);
  }

  return {
    name,
    relativeSecretFilePath: relative(fluenceDir, filePath),
    secretKey,
  } as const;
}

export async function genSecretKeyString(): Promise<string> {
  const { KeyPair } = await import("@fluencelabs/js-client");
  const keyPair = await KeyPair.randomEd25519();
  const privateKey = keyPair.toEd25519PrivateKey();
  return bufferToBase64(Buffer.from(privateKey));
}

export function base64ToUint8Array(base64: string) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
