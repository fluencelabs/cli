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

import fsPromises from "node:fs/promises";

import color from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import { FLUENCE_CONFIG_FILE_NAME } from "../../const";
import { validateUnique, ValidationResult } from "../../helpers/validations";
import { getArtifactsPath } from "../../pathsGetters/getArtifactsPath";
import { getProjectFluenceDirPath } from "../../pathsGetters/getProjectFluenceDirPath";
import { getProjectRootDir } from "../../pathsGetters/getProjectRootDir";
import {
  GetDefaultConfig,
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
} from "../initConfig";

type Service = { name: string; count?: number };

type ConfigV0 = {
  version: 0;
  services: Array<Service>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          count: { type: "number", nullable: true, minimum: 1 },
        },
        required: ["name"],
      },
    },
  },
  required: ["version", "services"],
};

const getDefault: GetDefaultConfig<
  LatestConfig
> = async (): Promise<ConfigV0> => {
  const artifactsPath = getArtifactsPath();

  let services: Array<Service> = [];
  try {
    services = (
      await fsPromises.readdir(artifactsPath, { withFileTypes: true })
    )
      .filter((item): boolean => item.isDirectory())
      .map(({ name }): ConfigV0["services"][0] => ({
        name,
      }));
  } catch {}

  return {
    version: 0,
    services,
  };
};

const migrations: Migrations<Config> = [];

const validate = (config: LatestConfig): ValidationResult =>
  validateUnique(
    config.services,
    ({ name }): string => name,
    (name): string =>
      `There are multiple services with the same name ${color.yellow(name)}`
  );

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type FluenceConfig = InitializedConfig<LatestConfig>;
export type FluenceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: FLUENCE_CONFIG_FILE_NAME,
  getPath: getProjectRootDir,
  getSchemaDirPath: (): string => getProjectFluenceDirPath(),
  validate,
};

export const initFluenceConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initReadonlyFluenceConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);
