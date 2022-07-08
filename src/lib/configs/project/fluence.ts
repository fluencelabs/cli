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

import path from "node:path";

import color from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import { ajv } from "../../ajv";
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

type ServiceV0 = { name: string; count?: number };

type ConfigV0 = {
  version: 0;
  services: Array<ServiceV0>;
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

type ServiceDeployV1 = { count?: number; peerId?: string };

type ServiceV1 = { get: string; deploy: Array<ServiceDeployV1> };

type ConfigV1 = {
  version: 1;
  services: Array<ServiceV1>;
};

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [1] },
    services: {
      type: "array",
      items: {
        type: "object",
        properties: {
          get: { type: "string" },
          deploy: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              properties: {
                count: {
                  type: "number",
                  minimum: 1,
                  nullable: true,
                },
                peerId: {
                  type: "string",
                  nullable: true,
                },
              },
            },
          },
        },
        required: ["get"],
      },
    },
  },
  required: ["version", "services"],
};

const getDefault: GetDefaultConfig<LatestConfig> = (): LatestConfig => ({
  version: 1,
  services: [],
});

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

const migrations: Migrations<Config> = [
  (config: Config): ConfigV1 => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${JSON.stringify(
          validateConfigSchemaV0.errors
        )}`
      );
    }

    const services = config.services.map(
      ({ name, count = 1 }): ServiceV1 => ({
        get: path.relative(
          getProjectRootDir(),
          path.join(getArtifactsPath(), name)
        ),
        deploy: [{ count }],
      })
    );

    return {
      version: 1,
      services,
    };
  },
];

const validate = (config: LatestConfig): ValidationResult =>
  validateUnique(
    config.services,
    ({ get }): string => get,
    (get): string =>
      `There are multiple services with the same get ${color.yellow(get)}`
  );

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type FluenceConfig = InitializedConfig<LatestConfig>;
export type FluenceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
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
