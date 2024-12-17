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

import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";

import { bufferToBase64 } from "./helpers/typesafeStringify.js";
import { ensureFluenceSecretsFilePath, getFluenceDir } from "./paths.js";

export async function genSecretKeyOrReturnExisting(name: string) {
  const fluenceDir = getFluenceDir();
  const filePath = await ensureFluenceSecretsFilePath(name);
  let secretKey;

  try {
    secretKey = await readFile(filePath, "utf8");
  } catch {
    secretKey = await genSecretKeyString();
    await writeFile(filePath, secretKey, "utf8");
  }

  return {
    name,
    relativeSecretFilePath: relative(fluenceDir, filePath),
    secretKey,
  } as const;
}

async function genSecretKeyString(): Promise<string> {
  const { KeyPair } = await import("@fluencelabs/js-client");
  const keyPair = await KeyPair.randomEd25519();
  const privateKey = keyPair.toEd25519PrivateKey();
  return bufferToBase64(Buffer.from(privateKey));
}

export function base64ToUint8Array(base64: string) {
  return new Uint8Array(Buffer.from(base64, "base64"));
}
