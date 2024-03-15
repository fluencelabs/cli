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

import { copyFile, mkdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

import { parse } from "@iarna/toml";
import type { JSONSchemaType } from "ajv";

import { ajv, validationErrorToString } from "../ajvInstance.js";
import { buildModules } from "../buildModules.js";
import { commandObj } from "../commandObj.js";
import type { FluenceConfigReadonly } from "../configs/project/fluence.js";
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
  maybeFluenceConfig: FluenceConfigReadonly | undefined | null;
  destination: string;
  bindingCrate: string | undefined;
};

export async function packModule({
  moduleConfig,
  marineCli,
  marineBuildArgs,
  maybeFluenceConfig,
  destination,
  bindingCrate,
}: PackModuleArgs) {
  await buildModules(
    [moduleConfig],
    marineCli,
    marineBuildArgs,
    maybeFluenceConfig,
  );

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
  /* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment,  @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/restrict-template-expressions  */
  const ipfsClient = await createIPFSClient(DEFAULT_IPFS_ADDRESS);

  const { cid } = await ipfsClient.add(await readFile(tmpWasmPath), {
    cidVersion: 1,
    onlyHash: true,
  });

  moduleToPackConfig.cid = cid.toString();
  const resolvedBindingCrate = await resolveBindingCrate(bindingCrate);

  if (resolvedBindingCrate !== undefined) {
    moduleToPackConfig.rustBindingCrate = resolvedBindingCrate;
  }

  await moduleToPackConfig.$commit();

  const tar = (await import("tar")).default;

  await mkdir(destination, { recursive: true });

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
