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
import path from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import { ajv } from "../../ajvInstance.js";
import {
  AQUA_LIB_NPM_DEPENDENCY,
  AQUA_LIB_RECOMMENDED_VERSION,
  FLUENCE_CONFIG_FILE_NAME,
  FS_OPTIONS,
  MAIN_AQUA_FILE_CONTENT,
  PROJECT_SECRETS_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  USER_SECRETS_CONFIG_FILE_NAME,
} from "../../const.js";
import { jsonStringify } from "../../helpers/jsonStringify.js";
import { NETWORKS, Relays } from "../../multiaddres.js";
import {
  ensureFluenceDir,
  ensureSrcAquaMainPath,
  projectRootDirPromise,
} from "../../paths.js";
import {
  getConfigInitFunction,
  InitConfigOptions,
  InitializedConfig,
  InitializedReadonlyConfig,
  getReadonlyConfigInitFunction,
  Migrations,
  ConfigValidateFunction,
} from "../initConfig.js";

import { moduleProperties } from "./module.js";
import type { ModuleV0 as ServiceModuleConfig } from "./service.js";

type ServiceV0 = { name: string; count?: number };

type ConfigV0 = {
  version: 0;
  services: Array<ServiceV0>;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", const: 0 },
    services: {
      title: "Services",
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

export const DISTRIBUTION_EVEN = "even";
export const DISTRIBUTION_RANDOM = "random";
export const DISTRIBUTIONS = [DISTRIBUTION_EVEN, DISTRIBUTION_RANDOM] as const;

export type OverrideModules = Record<string, FluenceConfigModule>;
export type Distribution = (typeof DISTRIBUTIONS)[number];
export type ServiceDeployV1 = {
  deployId: string;
  count?: number;
  peerId?: string;
  peerIds?: Array<string>;
  overrideModules?: OverrideModules;
  distribution?: Distribution;
  keyPairName?: string;
};
export type FluenceConfigModule = Partial<ServiceModuleConfig>;

type ServiceV1 = {
  get: string;
  overrideModules?: OverrideModules;
  deploy?: Array<ServiceDeployV1>;
  keyPairName?: string;
};

type ConfigV1 = {
  version: 1;
  services?: Record<string, ServiceV1>;
  relays?: Relays;
  peerIds?: Record<string, string>;
  keyPairName?: string;
};

const keyPairName = {
  type: "string",
  nullable: true,
  description: `The name of the Key Pair to use. It is resolved in the following order (from the lowest to the highest priority):
1. "defaultKeyPairName" property from ${USER_SECRETS_CONFIG_FILE_NAME}
1. "defaultKeyPairName" property from ${PROJECT_SECRETS_CONFIG_FILE_NAME}
1. "keyPairName" property from the top level of ${FLUENCE_CONFIG_FILE_NAME}
1. "keyPairName" property from the "services" level of ${FLUENCE_CONFIG_FILE_NAME}
1. "keyPairName" property from the individual "deploy" property item level of ${FLUENCE_CONFIG_FILE_NAME}`,
} as const;

const configSchemaV1Obj = {
  type: "object",
  properties: {
    services: {
      title: "Services",
      description:
        "A map with service names as keys and Service configs as values. You can have any number of services listed here (According to JSON schema they are called 'additionalProperties') as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use `fluence service add` command to add a service to this config",
      type: "object",
      additionalProperties: {
        title: "Service config",
        description:
          "Service names as keys (must start with a lowercase letter and contain only letters numbers and underscores) and Service config (defines where the service is and how to deploy it) as values",
        type: "object",
        properties: {
          get: {
            type: "string",
            description: `Path to service directory or URL to the tar.gz archive with the service`,
          },
          overrideModules: {
            type: "object",
            title: "Overrides",
            description: "A map of modules to override",
            additionalProperties: {
              type: "object",
              title: "Module overrides",
              description:
                "Module names as keys and overrides for the module config as values",
              properties: {
                ...moduleProperties,
                get: {
                  type: "string",
                  nullable: true,
                  description: `Path to module directory or URL to the tar.gz archive with the module`,
                },
                name: { ...moduleProperties.name, nullable: true },
              },
              required: [],
              nullable: true,
            },
            nullable: true,
            required: [],
          },
          deploy: {
            type: "array",
            title: "Deployment list",
            nullable: true,
            description: "List of deployments for the particular service",
            items: {
              type: "object",
              title: "Deployment",
              description:
                "A small config for a particular deployment. You can have specific overrides for each and specific deployment properties like count, distribution, etc.",
              properties: {
                keyPairName,
                deployId: {
                  type: "string",
                  description: `This id can be used in Aqua to access actually deployed peer and service ids. The ID must start with a lowercase letter and contain only letters, numbers, and underscores.`,
                },
                count: {
                  type: "number",
                  minimum: 1,
                  nullable: true,
                  description: `Number of services to deploy. Default: 1 or if "peerIds" property is provided - exactly the number of peerIds`,
                },
                peerId: {
                  type: "string",
                  nullable: true,
                  description: `Peer id or peer id name to deploy to. Default: Peer ids from the "relay" property of ${FLUENCE_CONFIG_FILE_NAME} are selected for each deploy. Named peerIds can be listed in "peerIds" property of ${FLUENCE_CONFIG_FILE_NAME})`,
                },
                peerIds: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                  nullable: true,
                  title: "Peer ids",
                  description: `Peer ids or peer id names to deploy to. Overrides "peerId" property. Named peerIds can be listed in "peerIds" property of ${FLUENCE_CONFIG_FILE_NAME})`,
                },
                distribution: {
                  type: "string",
                  enum: DISTRIBUTIONS,
                  nullable: true,
                  description: `"even" distribution is used by default, means that the services will be deployed evenly across the listed peers. "random" distribution means that the services will be deployed randomly across the listed peers.`,
                },
                overrideModules: {
                  type: "object",
                  title: "Overrides",
                  description: "A map of modules to override",
                  additionalProperties: {
                    type: "object",
                    title: "Module overrides",
                    description:
                      "Module names as keys and overrides for the module config as values",
                    properties: {
                      ...moduleProperties,
                      get: {
                        type: "string",
                        nullable: true,
                        description: `Path to module directory or URL to the tar.gz archive with the module`,
                      },
                      name: { ...moduleProperties.name, nullable: true },
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
          keyPairName,
        },
        required: ["get"],
      },
      required: [],
      nullable: true,
    },
    relays: {
      title: "Relays",
      description: `List of Fluence Peer multi addresses or a name of the network. This multi addresses are used for connecting to the Fluence network when deploying. Peer ids from these addresses are also used for deploying in case if you don't specify "peerId" or "peerIds" property in the deployment config. Default: ${NETWORKS[0]}`,
      type: ["string", "array"],
      oneOf: [
        { type: "string", title: "Network name", enum: NETWORKS },
        {
          type: "array",
          title: "Multi addresses",
          items: { type: "string" },
        },
      ],
      nullable: true,
    },
    peerIds: {
      title: "Peer ids",
      description:
        "A map of named peerIds. Example:\n\nMY_PEER: 12D3KooWCMr9mU894i8JXAFqpgoFtx6qnV1LFPSfVc3Y34N4h4LS",
      type: "object",
      nullable: true,
      required: [],
      additionalProperties: {
        type: "string",
        description: "Peer id names as keys and the actual peer ids as values",
      },
    },
    keyPairName,
    version: { type: "number", const: 1 },
  },
  required: ["version"],
} as const;

const configSchemaV1: JSONSchemaType<ConfigV1> = configSchemaV1Obj;

export const AQUA_INPUT_PATH_PROPERTY = "aquaInputPath";

type ConfigV2 = Omit<ConfigV1, "version"> & {
  version: 2;
  dependencies?: {
    npm?: Record<string, string>;
    cargo?: Record<string, string>;
  };
  [AQUA_INPUT_PATH_PROPERTY]?: string;
  aquaOutputTSPath?: string;
  aquaOutputJSPath?: string;
  appTSPath?: string;
  appJSPath?: string;
};

const configSchemaV2: JSONSchemaType<ConfigV2> = {
  ...configSchemaV1Obj,
  $id: `${TOP_LEVEL_SCHEMA_ID}/${FLUENCE_CONFIG_FILE_NAME}`,
  title: FLUENCE_CONFIG_FILE_NAME,
  description:
    "Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use `fluence init` command to generate a template for new Fluence project",
  properties: {
    ...configSchemaV1Obj.properties,
    version: { type: "number", const: 2 },
    dependencies: {
      type: "object",
      title: "Dependencies",
      nullable: true,
      description: "A map of dependency versions",
      properties: {
        npm: {
          type: "object",
          title: "npm dependencies",
          nullable: true,
          description:
            "A map of npm dependency versions. CLI ensures dependencies are installed each time you run aqua",
          required: [],
        },
        cargo: {
          type: "object",
          title: "Cargo dependencies",
          nullable: true,
          description: `A map of cargo dependency versions. CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL`,
          required: [],
        },
      },
      required: [],
    },
    [AQUA_INPUT_PATH_PROPERTY]: {
      type: "string",
      nullable: true,
      description: `Path to the aqua file or directory with aqua files that you want to compile by default`,
    },
    aquaOutputTSPath: {
      type: "string",
      nullable: true,
      description: "Default compilation target dir from aqua to ts",
    },
    aquaOutputJSPath: {
      type: "string",
      nullable: true,
      description: `Default compilation target dir from aqua to js. Overrides "aquaOutputTSPath" property`,
    },
    appTSPath: {
      type: "string",
      nullable: true,
      description:
        "Path to the directory where you want to generate app.ts after deployment. If you run registerApp() function in your typescript code after initializing FluenceJS client you will be able to access ids of the deployed services in aqua",
    },
    appJSPath: {
      type: "string",
      nullable: true,
      description:
        "Path to the directory where you want to generate app.js after deployment. If you run registerApp() function in your javascript code after initializing FluenceJS client you will be able to access ids of the deployed services in aqua",
    },
  },
};

const initFluenceProject = async (): Promise<ConfigV2> => {
  const srcMainAquaPath = await ensureSrcAquaMainPath();

  try {
    await fsPromises.access(srcMainAquaPath);
  } catch {
    await fsPromises.writeFile(
      srcMainAquaPath,
      MAIN_AQUA_FILE_CONTENT,
      FS_OPTIONS
    );
  }

  const srcMainAquaPathRelative = path.relative(
    await projectRootDirPromise,
    srcMainAquaPath
  );

  return {
    version: 2,
    [AQUA_INPUT_PATH_PROPERTY]: srcMainAquaPathRelative,
    dependencies: {
      npm: {
        [AQUA_LIB_NPM_DEPENDENCY]: AQUA_LIB_RECOMMENDED_VERSION,
      },
    },
  } as const;
};

const getDefault = (): Promise<LatestConfig> => initFluenceProject();

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);
const validateConfigSchemaV1 = ajv.compile(configSchemaV1);

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${jsonStringify(
          validateConfigSchemaV0.errors
        )}`
      );
    }

    const projectRootDir = await projectRootDirPromise;

    const services = config.services.reduce<Record<string, ServiceV1>>(
      (acc, { name, count = 1 }, i): Record<string, ServiceV1> => ({
        ...acc,
        [name]: {
          get: path.relative(
            projectRootDir,
            path.join(projectRootDir, "artifacts", name)
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
  async (config: Config): Promise<ConfigV2> => {
    if (!validateConfigSchemaV1(config)) {
      throw new Error(
        `Migration error. Errors: ${jsonStringify(
          validateConfigSchemaV1.errors
        )}`
      );
    }

    return {
      ...config,
      ...(await initFluenceProject()),
    };
  },
];

type Config = ConfigV0 | ConfigV1 | ConfigV2;
type LatestConfig = ConfigV2;
export type FluenceConfig = InitializedConfig<LatestConfig>;
export type FluenceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

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

    for (const { deployId } of deploy ?? []) {
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
  allSchemas: [configSchemaV0, configSchemaV1, configSchemaV2],
  latestSchema: configSchemaV2,
  migrations,
  name: FLUENCE_CONFIG_FILE_NAME,
  getConfigDirPath: (): Promise<string> => projectRootDirPromise,
  getSchemaDirPath: ensureFluenceDir,
  validate,
};

export const initNewFluenceConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initFluenceConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyFluenceConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const fluenceSchema: JSONSchemaType<LatestConfig> = configSchemaV2;
