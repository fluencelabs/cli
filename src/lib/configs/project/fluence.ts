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
import { NETWORKS, Relays } from "../../multiaddr";
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

import type { ModuleV0 as ServiceModuleConfig } from "./service";

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

export type AppConfigModule = Partial<ServiceModuleConfig>;

export type Overrides = {
  name?: string;
  modules?: Record<string, AppConfigModule>;
};

type ServiceV1 = {
  get: string;
  deploy: Array<ServiceDeployV1>;
  overrides?: Overrides;
};

type ConfigV1 = {
  version: 1;
  services?: Array<ServiceV1>;
  relays?: Relays;
  peerIds?: Record<string, string>;
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
          overrides: {
            type: "object",
            properties: {
              name: { type: "string", nullable: true },
              modules: {
                type: "object",
                additionalProperties: {
                  type: "object",
                  properties: {
                    get: { type: "string", nullable: true },
                    name: { type: "string", nullable: true },
                    maxHeapSize: { type: "string", nullable: true },
                    loggerEnabled: { type: "boolean", nullable: true },
                    loggingMask: { type: "number", nullable: true },
                    mappedDirs: {
                      type: "object",
                      nullable: true,
                      required: [],
                    },
                    preopenedFiles: {
                      type: "array",
                      nullable: true,
                      items: { type: "string" },
                    },
                    envs: { type: "object", nullable: true, required: [] },
                    mountedBinaries: {
                      type: "object",
                      nullable: true,
                      required: [],
                    },
                  },
                  required: [],
                  nullable: true,
                },
                nullable: true,
                required: [],
              },
            },
            required: [],
            nullable: true,
          },
        },
        required: ["get", "deploy"],
      },
      nullable: true,
    },
    relays: {
      type: ["string", "array"],
      oneOf: [
        { type: "string", enum: NETWORKS },
        { type: "array", items: { type: "string" } },
      ],
      nullable: true,
    },
    peerIds: {
      type: "object",
      nullable: true,
      required: [],
      additionalProperties: { type: "string" },
    },
  },
  required: ["version"],
};

const getDefault: GetDefaultConfig<LatestConfig> = (): LatestConfig => ({
  version: 1,
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
  config.services === undefined ||
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
