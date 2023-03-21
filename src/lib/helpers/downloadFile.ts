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

import crypto from "node:crypto";
import fsPromises from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import decompress from "decompress";
import filenamify from "filenamify";
import fetch from "node-fetch";

import { commandObj } from "../commandObj.js";
import { getConfigPath } from "../configs/initConfig.js";
import {
  MODULE_CONFIG_FILE_NAME,
  MODULE_TYPE_RUST,
  SERVICE_CONFIG_FILE_NAME,
  SPELL_CONFIG_FILE_NAME,
  WASM_EXT,
} from "../const.js";
import {
  ensureFluenceModulesDir,
  ensureFluenceServicesDir,
  ensureFluenceSpellsDir,
  projectRootDir,
} from "../paths.js";
import { input } from "../prompt.js";

export const getHashOfString = (str: string): Promise<string> => {
  const md5Hash = crypto.createHash("md5");
  return new Promise((resolve): void => {
    md5Hash.on("readable", (): void => {
      const data: unknown = md5Hash.read();

      if (data instanceof Buffer) {
        resolve(data.toString("hex"));
      }
    });

    md5Hash.write(str);
    md5Hash.end();
  });
};

const downloadFile = async (path: string, url: string): Promise<string> => {
  const res = await fetch(url);

  if (res.status === 404) {
    return commandObj.error(`Failed when downloading ${color.yellow(url)}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  await fsPromises.writeFile(path, new Uint8Array(arrayBuffer));
  return path;
};

type EnsureValidAquaNameArg = {
  stringToValidate: string | undefined;
} & Parameters<typeof input>[0];

export const AQUA_NAME_REQUIREMENTS =
  "must start with a lowercase letter and contain only letters, numbers, and underscores";

export const ensureValidAquaName = async ({
  stringToValidate,
  ...inputArg
}: EnsureValidAquaNameArg): Promise<string> => {
  if (
    stringToValidate === undefined ||
    validateAquaName(stringToValidate) !== true
  ) {
    return input({
      ...inputArg,
      message: `${inputArg.message} (${AQUA_NAME_REQUIREMENTS})`,
      validate: validateAquaName,
    });
  }

  return stringToValidate;
};

export const validateAquaName = (text: string): true | string =>
  /^[a-z]\w*$/.test(text) || AQUA_NAME_REQUIREMENTS;

export const cleanAquaName = (text: string): string => text.replace(/\W/g, "");

const ARCHIVE_FILE = "archive.tar.gz";

const getDownloadDirPath = async (
  get: string,
  pathStart: string
): Promise<string> => {
  const hash = await getHashOfString(get);
  const cleanPrefix = get.replace(".tar.gz?raw=true", "");
  const withoutTrailingSlash = cleanPrefix.replace(/\/$/, "");

  const lastPortionOfPath =
    withoutTrailingSlash
      .split(withoutTrailingSlash.includes("/") ? "/" : "\\")
      .slice(-1)[0] ?? "";

  const prefix =
    lastPortionOfPath === "" ? "" : `${filenamify(lastPortionOfPath)}_`;

  return join(pathStart, `${prefix}${hash}`);
};

const downloadAndDecompress = async (
  get: string,
  pathStart: string
): Promise<string> => {
  const dirPath = await getDownloadDirPath(get, pathStart);

  try {
    await fsPromises.access(dirPath);
    return dirPath;
  } catch {}

  await fsPromises.mkdir(dirPath, { recursive: true });
  const archivePath = join(dirPath, ARCHIVE_FILE);
  await downloadFile(archivePath, get);
  await decompress(archivePath, dirPath);
  await fsPromises.unlink(archivePath);
  return dirPath;
};

export const downloadModule = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureFluenceModulesDir());

export const downloadService = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureFluenceServicesDir());

export const downloadSpell = async (get: string): Promise<string> =>
  downloadAndDecompress(get, await ensureFluenceSpellsDir());

export const getModulePathFromUrl = async (get: string): Promise<string> =>
  getDownloadDirPath(get, await ensureFluenceModulesDir());

export const getServicePathFromUrl = async (get: string): Promise<string> =>
  getDownloadDirPath(get, await ensureFluenceServicesDir());

export const getSpellPathFromUrl = async (get: string): Promise<string> =>
  getDownloadDirPath(get, await ensureFluenceSpellsDir());

export const isUrl = (unknown: string): boolean =>
  unknown.startsWith("http://") || unknown.startsWith("https://");

export const getModuleWasmPath = (config: {
  type?: string;
  name: string;
  $getDirPath: () => string;
}): string => {
  const fileName = `${config.name}.${WASM_EXT}`;
  const configDirName = config.$getDirPath();
  return config.type === MODULE_TYPE_RUST
    ? resolve(projectRootDir, "target", "wasm32-wasi", "release", fileName)
    : resolve(configDirName, fileName);
};

export const getUrlOrAbsolutePath = (
  pathOrUrl: string,
  absolutePath: string
): string => {
  if (isUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  if (isAbsolute(pathOrUrl)) {
    return pathOrUrl;
  }

  return resolve(absolutePath, pathOrUrl);
};

const ensureOrGetConfigAbsolutePath =
  (
    downloadOrGetFunction: (get: string) => Promise<string>,
    configName: string
  ) =>
  async (
    pathOrUrl: string,
    absolutePath: string | undefined
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
            pathOrUrl
          )} is not absolute and no absolute path was provided`
        );
      }

      return resolve(absolutePath, pathOrUrl);
    })();

    return getConfigPath(dirOrConfigAbsolutePath, configName).configPath;
  };

export const ensureModuleAbsolutePath = ensureOrGetConfigAbsolutePath(
  downloadModule,
  MODULE_CONFIG_FILE_NAME
);
export const ensureServiceAbsolutePath = ensureOrGetConfigAbsolutePath(
  downloadService,
  SERVICE_CONFIG_FILE_NAME
);
export const ensureSpellAbsolutePath = ensureOrGetConfigAbsolutePath(
  downloadSpell,
  SPELL_CONFIG_FILE_NAME
);

export const getModuleAbsolutePath = ensureOrGetConfigAbsolutePath(
  getModulePathFromUrl,
  MODULE_CONFIG_FILE_NAME
);
export const getServiceAbsolutePath = ensureOrGetConfigAbsolutePath(
  getServicePathFromUrl,
  SERVICE_CONFIG_FILE_NAME
);
export const getSpellAbsolutePath = ensureOrGetConfigAbsolutePath(
  getSpellPathFromUrl,
  SPELL_CONFIG_FILE_NAME
);
