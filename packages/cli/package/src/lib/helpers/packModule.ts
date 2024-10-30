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

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { parse } from "@iarna/toml";
import type { JSONSchemaType } from "ajv";

import { ajv, validationErrorToString } from "../ajvInstance.js";
import { buildModules } from "../buildModules.js";
import { commandObj } from "../commandObj.js";
import {
  type ModuleConfigReadonly,
  initNewModuleConfig,
} from "../configs/project/module.js";
import {
  CARGO_TOML,
  DEFAULT_IPFS_ADDRESS,
  FS_OPTIONS,
  MODULE_CONFIG_FULL_FILE_NAME,
  WASM_EXT,
} from "../const.js";
import { createIPFSClient } from "../localServices/ipfs.js";
import type { MarineCLI } from "../marineCli.js";
import { ensureFluenceTmpModulePath } from "../paths.js";

import { getModuleWasmPath } from "./downloadFile.js";

type PackModuleArgs = {
  moduleConfig: ModuleConfigReadonly;
  marineCli: MarineCLI;
  marineBuildArgs: string | undefined;
  destination: string;
  bindingCrate: string | undefined;
};

export async function packModule({
  moduleConfig,
  marineCli,
  marineBuildArgs,
  destination,
  bindingCrate,
}: PackModuleArgs) {
  await buildModules([moduleConfig], marineCli, marineBuildArgs);
  const wasmPath = getModuleWasmPath(moduleConfig);
  const tmpModuleDirPath = await ensureFluenceTmpModulePath();

  const tmpModuleConfigDirPath = join(
    tmpModuleDirPath,
    MODULE_CONFIG_FULL_FILE_NAME,
  );

  await copyFile(moduleConfig.$getPath(), tmpModuleConfigDirPath);

  const tmpWasmPath = join(
    tmpModuleDirPath,
    `${moduleConfig.name}.${WASM_EXT}`,
  );

  await copyFile(wasmPath, tmpWasmPath);

  const moduleToPackConfig = await initNewModuleConfig(
    tmpModuleConfigDirPath,
    moduleConfig.name,
  );

  delete moduleToPackConfig.type;
  // Have to disable this cause ipfs lib types look like any with "nodenext" moduleResolution
  /* eslint-disable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call  */
  const ipfsClient = await createIPFSClient(DEFAULT_IPFS_ADDRESS);

  const { cid } = await ipfsClient.add(await readFile(tmpWasmPath), {
    cidVersion: 1,
    onlyHash: true,
  });

  // eslint-disable-next-line no-restricted-syntax
  moduleToPackConfig.cid = cid.toString();
  /* eslint-enable @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call  */

  const resolvedBindingCrate = await resolveBindingCrate(bindingCrate);

  if (resolvedBindingCrate !== undefined) {
    moduleToPackConfig.rustBindingCrate = resolvedBindingCrate;
  }

  await moduleToPackConfig.$commit();

  await mkdir(destination, { recursive: true });
  const tar = await import("tar");

  await tar.c(
    {
      file: join(destination, `${moduleConfig.name}.tar.gz`),
      gzip: true,
      cwd: tmpModuleDirPath,
    },
    [
      relative(tmpModuleDirPath, tmpModuleConfigDirPath),
      relative(tmpModuleDirPath, tmpWasmPath),
    ],
  );
}

type ConfigToml = {
  package: {
    name: string;
    version: string;
  };
};

const configTomlSchema: JSONSchemaType<ConfigToml> = {
  type: "object",
  properties: {
    package: {
      type: "object",
      properties: {
        name: { type: "string" },
        version: { type: "string" },
      },
      required: ["name", "version"],
    },
  },
  required: ["package"],
};

const validateConfigToml = ajv.compile(configTomlSchema);

async function resolveBindingCrate(bindingCrate: string | undefined) {
  if (bindingCrate === undefined) {
    return undefined;
  }

  const bindingCrateFileContent = await readFile(
    join(bindingCrate, CARGO_TOML),
    FS_OPTIONS,
  );

  const parsedBindingCrate: unknown = parse(bindingCrateFileContent);

  if (!validateConfigToml(parsedBindingCrate)) {
    return commandObj.error(
      `Invalid binding crate ${CARGO_TOML} file. Errors: ${await validationErrorToString(
        validateConfigToml.errors,
      )}`,
    );
  }

  return {
    name: parsedBindingCrate.package.name,
    version: parsedBindingCrate.package.version,
  };
}
