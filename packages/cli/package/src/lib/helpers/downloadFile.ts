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

import crypto from "node:crypto";
import { access, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve } from "node:path";

import { color } from "@oclif/color";

import { bufferToHex } from "../../common.js";
import { commandObj } from "../commandObj.js";
import { getConfigPath } from "../configs/initConfig.js";
import {
  MODULE_CONFIG_FULL_FILE_NAME,
  MODULE_TYPE_RUST,
  SERVICE_CONFIG_FULL_FILE_NAME,
  SPELL_CONFIG_FULL_FILE_NAME,
  WASM_EXT,
} from "../const.js";
import {
  ensureFluenceModulesDir,
  ensureFluenceServicesDir,
  ensureFluenceSpellsDir,
  projectRootDir,
} from "../paths.js";

function getHashOfString(str: string): Promise<string> {
  const md5Hash = crypto.createHash("md5");
  return new Promise((resolve): void => {
    md5Hash.on("readable", (): void => {
      const data: unknown = md5Hash.read();

      if (data instanceof Buffer) {
        resolve(bufferToHex(data));
      }
    });

    md5Hash.write(str);
    md5Hash.end();
  });
}

export async function downloadFile(
  outputPath: string,
  url: string,
): Promise<string> {
  const res = await fetch(url);

  if (!res.ok) {
    return commandObj.error(`Failed when downloading ${color.yellow(url)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, new Uint8Array(arrayBuffer));
  return outputPath;
}

export const AQUA_NAME_REQUIREMENTS =
  "must start with a lowercase letter and contain only letters, numbers, and underscores";

export function validateAquaName(text: string): true | string {
  return (
    /^[a-z]\w*$/.test(text) || `${color.yellow(text)} ${AQUA_NAME_REQUIREMENTS}`
  );
}

export function validateAquaTypeName(text: string): true | string {
  return (
    /^[A-Z]\w*$/.test(text) ||
    `${color.yellow(
      text,
    )} must start with an uppercase letter and contain only letters, numbers, and underscores`
  );
}

const ARCHIVE_FILE = "archive.tar.gz";

async function getDownloadDirPath(
  get: string,
  pathStart: string,
): Promise<string> {
  const hash = await getHashOfString(get);
  const cleanPrefix = get.replace(".tar.gz?raw=true", "");
  const withoutTrailingSlash = cleanPrefix.replace(/\/$/, "");

  const lastPortionOfPath =
    withoutTrailingSlash
      .split(withoutTrailingSlash.includes("/") ? "/" : "\\")
      .slice(-1)[0] ?? "";

  const filenamify = (await import("filenamify")).default;

  const prefix =
    lastPortionOfPath === "" ? "" : `${filenamify(lastPortionOfPath)}_`;

  return join(pathStart, `${prefix}${hash}`);
}

async function downloadAndDecompress(
  get: string,
  pathStart: string,
): Promise<string> {
  const dirPath = await getDownloadDirPath(get, pathStart);

  try {
    await access(dirPath);
    return dirPath;
  } catch {}

  const archivePath = join(dirPath, ARCHIVE_FILE);
  await downloadFile(archivePath, get);
  const tar = await import("tar");

  await tar.x({
    cwd: dirPath,
    file: archivePath,
  });

  await rm(archivePath, { force: true });
  return dirPath;
}

export async function downloadModule(get: string): Promise<string> {
  return downloadAndDecompress(get, await ensureFluenceModulesDir());
}

async function downloadService(get: string): Promise<string> {
  return downloadAndDecompress(get, await ensureFluenceServicesDir());
}

async function downloadSpell(get: string): Promise<string> {
  return downloadAndDecompress(get, await ensureFluenceSpellsDir());
}

async function getModulePathFromUrl(get: string): Promise<string> {
  return getDownloadDirPath(get, await ensureFluenceModulesDir());
}

async function getServicePathFromUrl(get: string): Promise<string> {
  return getDownloadDirPath(get, await ensureFluenceServicesDir());
}

export function isUrl(unknown: string): boolean {
  return unknown.startsWith("http://") || unknown.startsWith("https://");
}

export function getModuleWasmPath(moduleConfig: {
  type?: string;
  name: string;
  $getDirPath: () => string;
}): string {
  const fileName = `${moduleConfig.name}.${WASM_EXT}`;
  const configDirName = moduleConfig.$getDirPath();
  return moduleConfig.type === MODULE_TYPE_RUST
    ? resolve(projectRootDir, "target", "wasm32-wasi", "release", fileName)
    : resolve(configDirName, fileName);
}

export function getUrlOrAbsolutePath(
  pathOrUrl: string,
  absolutePath: string,
): string {
  if (isUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  if (isAbsolute(pathOrUrl)) {
    return pathOrUrl;
  }

  return resolve(absolutePath, pathOrUrl);
}

function ensureOrGetConfigAbsolutePath(
  downloadOrGetFunction: (get: string) => Promise<string>,
  configName: string,
) {
  return async (
    pathOrUrl: string,
    absolutePath: string | undefined,
  ): Promise<string> => {
    const dirOrConfigAbsolutePath = await (async (): Promise<string> => {
      if (isUrl(pathOrUrl)) {
        return downloadOrGetFunction(pathOrUrl);
      }

      if (isAbsolute(pathOrUrl)) {
        return pathOrUrl;
      }

      if (absolutePath === undefined) {
        throw new Error(
          `Path ${color.yellow(
            pathOrUrl,
          )} is not absolute and no absolute path was provided`,
        );
      }

      return resolve(absolutePath, pathOrUrl);
    })();

    return getConfigPath(dirOrConfigAbsolutePath, configName).configPath;
  };
}

export const ensureModuleAbsolutePath = ensureOrGetConfigAbsolutePath(
  downloadModule,
  MODULE_CONFIG_FULL_FILE_NAME,
);
export const ensureServiceAbsolutePath = ensureOrGetConfigAbsolutePath(
  downloadService,
  SERVICE_CONFIG_FULL_FILE_NAME,
);
export const ensureSpellAbsolutePath = ensureOrGetConfigAbsolutePath(
  downloadSpell,
  SPELL_CONFIG_FULL_FILE_NAME,
);

export const getModuleAbsolutePath = ensureOrGetConfigAbsolutePath(
  getModulePathFromUrl,
  MODULE_CONFIG_FULL_FILE_NAME,
);
export const getServiceAbsolutePath = ensureOrGetConfigAbsolutePath(
  getServicePathFromUrl,
  SERVICE_CONFIG_FULL_FILE_NAME,
);
