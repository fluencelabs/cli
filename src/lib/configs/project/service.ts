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

import type { JSONSchemaType } from "ajv";

import { CommandObj, SERVICE_CONFIG_FILE_NAME } from "../../const";
import { ensureFluenceDir } from "../../paths";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  GetDefaultConfig,
} from "../initConfig";

import type { ConfigV0 as ModuleConfig } from "./module";

export type ModuleV0 = {
  get: string;
} & Partial<Omit<ModuleConfig, "version">>;

export type Module = ModuleV0;

const moduleSchema: JSONSchemaType<ModuleV0> = {
  type: "object",
  properties: {
    get: { type: "string" },
    type: { type: "string", nullable: true, enum: ["rust"] },
    name: { type: "string", nullable: true },
    maxHeapSize: { type: "string", nullable: true },
    loggerEnabled: { type: "boolean", nullable: true },
    loggingMask: { type: "number", nullable: true },
    volumes: { type: "object", nullable: true, required: [] },
    preopenedFiles: {
      type: "array",
      nullable: true,
      items: { type: "string" },
    },
    envs: { type: "object", nullable: true, required: [] },
    mountedBinaries: { type: "object", nullable: true, required: [] },
  },
  required: ["get"],
};

export const FACADE_MODULE_NAME = "facade";

export type ConfigV0 = {
  version: 0;
  modules: { [FACADE_MODULE_NAME]: ModuleV0 } & Record<string, ModuleV0>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    modules: {
      type: "object",
      additionalProperties: moduleSchema,
      properties: {
        [FACADE_MODULE_NAME]: moduleSchema,
      },
      required: [FACADE_MODULE_NAME],
    },
  },
  required: ["version", "modules"],
};

const migrations: Migrations<Config> = [];

const examples = `
modules:
  facade:
    get: modules/facade

    # Overrides for module:
    maxHeapSize: "100" # 100 bytes
    # maxHeapSize: 100K # 100 kilobytes
    # maxHeapSize: 100 Ki # 100 kibibytes
    # Max size of the heap that a module can allocate in format: <number><whitespace?><specificator?>
    # where ? is an optional field and specificator is one from the following (case-insensitive):
    # K, Kb - kilobyte; Ki, KiB - kibibyte; M, Mb - megabyte; Mi, MiB - mebibyte; G, Gb - gigabyte; Gi, GiB - gibibyte;
    # Current limit is 4 GiB
    loggerEnabled: true # true, if it allows module to use the Marine SDK logger.
    loggingMask: 0 # manages the logging targets, described in here: https://doc.fluence.dev/marine-book/marine-rust-sdk/developing/logging#using-target-map
    mountedBinaries:
      curl: /usr/bin/curl # a map of mounted binary executable files
    preopenedFiles: # a list of files and directories that this module could access with WASI
      - ./dir
    volumes: # a map of accessible files and their aliases.
    # Aliases should be normally used in Marine module development because it's hard to know the full path to a file.
      aliasForSomePath: ./some/path
    envs: # environment variables accessible by a particular module with standard Rust env API like this std::env::var(IPFS_ADDR_ENV_NAME).
      # Please note that Marine adds three additional environment variables. Module environment variables could be examined with repl
      ENV1: arg1
      ENV2: arg2`;

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ServiceConfig = InitializedConfig<LatestConfig>;
export type ServiceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const getInitConfigOptions = (
  configDirPath: string
): InitConfigOptions<Config, LatestConfig> => ({
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: SERVICE_CONFIG_FILE_NAME,
  getSchemaDirPath: ensureFluenceDir,
  getConfigDirPath: (): string => configDirPath,
  examples,
});

export const initServiceConfig = (
  configDirPath: string,
  commandObj: CommandObj
): Promise<InitializedConfig<LatestConfig> | null> =>
  getConfigInitFunction(getInitConfigOptions(configDirPath))(commandObj);
export const initReadonlyServiceConfig = (
  configDirPath: string,
  commandObj: CommandObj
): Promise<InitializedReadonlyConfig<LatestConfig> | null> =>
  getReadonlyConfigInitFunction(getInitConfigOptions(configDirPath))(
    commandObj
  );
const getDefault: (
  relativePathToFacade: string
) => GetDefaultConfig<LatestConfig> =
  (relativePathToFacade: string): GetDefaultConfig<LatestConfig> =>
  (): LatestConfig => ({
    version: 0,
    modules: {
      [FACADE_MODULE_NAME]: {
        get: relativePathToFacade,
      },
    },
  });
export const initNewReadonlyServiceConfig = (
  configPath: string,
  commandObj: CommandObj,
  relativePathToFacade: string
): Promise<InitializedReadonlyConfig<LatestConfig> | null> =>
  getReadonlyConfigInitFunction(
    getInitConfigOptions(configPath),
    getDefault(relativePathToFacade)
  )(commandObj);
