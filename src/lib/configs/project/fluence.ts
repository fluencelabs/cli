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
import { NETWORKS, Relays } from "../../multiaddr";
import { ensureFluenceDir, getProjectRootDir } from "../../paths";
import {
  GetDefaultConfig,
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  ConfigValidateFunction,
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

export type OverrideModules = Record<string, FluenceConfigModule>;
export type ServiceDeployV1 = {
  deployId: string;
  count?: number;
  peerId?: string;
  overrideModules?: OverrideModules;
};
export type FluenceConfigModule = Partial<ServiceModuleConfig>;

type ServiceV1 = {
  get: string;
  deploy: Array<ServiceDeployV1>;
};

type ConfigV1 = {
  version: 1;
  services?: Record<string, ServiceV1>;
  relays?: Relays;
  peerIds?: Record<string, string>;
};

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [1] },
    services: {
      type: "object",
      additionalProperties: {
        type: "object",
        properties: {
          get: { type: "string" },
          deploy: {
            type: "array",
            items: {
              type: "object",
              properties: {
                deployId: {
                  type: "string",
                },
                count: {
                  type: "number",
                  minimum: 1,
                  nullable: true,
                },
                peerId: {
                  type: "string",
                  nullable: true,
                },
                overrideModules: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      get: { type: "string", nullable: true },
                      type: { type: "string", nullable: true, enum: ["rust"] },
                      name: { type: "string", nullable: true },
                      maxHeapSize: { type: "string", nullable: true },
                      loggerEnabled: { type: "boolean", nullable: true },
                      loggingMask: { type: "number", nullable: true },
                      volumes: {
                        type: "object",
                        nullable: true,
                        required: [],
                      },
                      preopenedFiles: {
                        type: "array",
                        nullable: true,
                        items: { type: "string" },
                      },
                      envs: {
                        type: "object",
                        nullable: true,
                        required: [],
                      },
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
              required: ["deployId"],
            },
          },
        },
        required: ["get", "deploy"],
      },
      required: [],
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

    const services = config.services.reduce<Record<string, ServiceV1>>(
      (acc, { name, count = 1 }, i): Record<string, ServiceV1> => ({
        ...acc,
        [name]: {
          get: path.relative(
            getProjectRootDir(),
            path.join(getProjectRootDir(), "artifacts", name)
          ),
          deploy: [
            { deployId: `default_${i}`, ...(count > 1 ? { count } : {}) },
          ],
        },
      }),
      {}
    );

    return {
      version: 1,
      services,
    };
  },
];

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type FluenceConfig = InitializedConfig<LatestConfig>;
export type FluenceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const examples = `
services:
  someService: # Service name in camelCase
    get: https://github.com/fluencelabs/services/blob/master/adder.tar.gz?raw=true # URL or path
    deploy:
      - deployId: default # any unique string in camelCase. Used in aqua to access deployed service ids
        # You can access deployment info in aqua like this:
        # services <- App.services()
        # on services.someService.default!.peerId:
        peerId: MY_PEER # Peer id or peer id name to deploy on. Default: Random peer id is selected for each deploy
        count: 1 # How many times to deploy. Default: 1
        # overrideModules: # Override modules from service.yaml
        #   facade:
        #     get: ./relative/path # Override facade module
peerIds: # A map of named peerIds. Optional.
  MY_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS
relays: kras # Array of relay multi-addresses or keywords: kras, testnet, stage. Default: kras`;

const validate: ConfigValidateFunction<LatestConfig> = (
  config
): ReturnType<ConfigValidateFunction<LatestConfig>> => {
  if (config.services === undefined) {
    return true;
  }
  const notUnique: Array<{
    serviceName: string;
    notUniqueDeployIds: Set<string>;
  }> = [];
  for (const [serviceName, { deploy }] of Object.entries(config.services)) {
    const deployIds = new Set<string>();
    const notUniqueDeployIds = new Set<string>();
    for (const { deployId } of deploy) {
      if (deployIds.has(deployId)) {
        notUniqueDeployIds.add(deployId);
      }
      deployIds.add(deployId);
    }
    if (notUniqueDeployIds.size > 0) {
      notUnique.push({ serviceName, notUniqueDeployIds });
    }
  }
  if (notUnique.length > 0) {
    return `Deploy ids must be unique. Not unique deploy ids found:\n${notUnique
      .map(
        ({ serviceName, notUniqueDeployIds }): string =>
          `${color.yellow(serviceName)}: ${[...notUniqueDeployIds].join(", ")}`
      )
      .join("\n")}`;
  }
  return true;
};

export const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
  migrations,
  name: FLUENCE_CONFIG_FILE_NAME,
  getConfigDirPath: getProjectRootDir,
  getSchemaDirPath: ensureFluenceDir,
  examples,
  validate,
};

export const initNewFluenceConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initNewReadonlyFluenceConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initFluenceConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyFluenceConfig =
  getReadonlyConfigInitFunction(initConfigOptions);
