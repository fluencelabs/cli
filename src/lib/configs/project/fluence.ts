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

import assert from "node:assert";
import fsPromises from "node:fs/promises";
import path, { join } from "node:path";

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import type { JSONSchemaType } from "ajv";

import { ajv } from "../../ajvInstance.js";
import {
  type ChainNetwork,
  CHAIN_NETWORKS,
  DEFAULT_WORKER_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FS_OPTIONS,
  MAIN_AQUA_FILE_CONTENT,
  PROJECT_SECRETS_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  USER_SECRETS_CONFIG_FILE_NAME,
  CONFIG_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  AQUA_DIR_NAME,
} from "../../const.js";
import { jsonStringify } from "../../helpers/jsonStringify.js";
import {
  validateAllVersionsAreExact,
  validateBatch,
} from "../../helpers/validations.js";
import { local, localMultiaddrs } from "../../localNodes.js";
import {
  getPeerId,
  getRandomPeerId,
  NETWORKS,
  type FluenceEnv,
  type Relays,
} from "../../multiaddres.js";
import {
  ensureFluenceDir,
  ensureSrcAquaMainPath,
  projectRootDir,
} from "../../paths.js";
import { FLUENCE_ENV } from "../../setupEnvironment.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
  type InitConfigOptions,
} from "../initConfig.js";

import {
  type OverridableModuleProperties,
  overridableModuleProperties,
} from "./module.js";
import {
  type OverridableSpellProperties,
  overridableSpellProperties,
} from "./spell.js";

export const MIN_WORKERS = 1;
export const TARGET_WORKERS = 3;

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

export type OverrideModules = Record<string, OverridableModuleProperties>;
export type ServiceDeployV1 = {
  deployId: string;
  count?: number;
  peerId?: string;
  peerIds?: Array<string>;
  overrideModules?: OverrideModules;
  keyPairName?: string;
};

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
                get: {
                  type: "string",
                  nullable: true,
                  description: `Path to module directory or URL to the tar.gz archive with the module`,
                },
                ...overridableModuleProperties,
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
                "A small config for a particular deployment. You can have specific overrides for each and specific deployment properties like count, etc.",
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
                      get: {
                        type: "string",
                        nullable: true,
                        description: `Path to module directory or URL to the tar.gz archive with the module`,
                      },
                      ...overridableModuleProperties,
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
          minItems: 1,
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

type FluenceConfigSpell = {
  get: string;
} & OverridableSpellProperties;

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
  hosts?: Record<string, { peerIds: Array<string> }>;
  workers?: Record<
    string,
    {
      services?: Array<string>;
      spells?: Array<string>;
    }
  >;
  deals?: Record<
    string,
    {
      minWorkers?: number;
      targetWorkers?: number;
    }
  >;
  chainNetwork?: ChainNetwork;
  spells?: Record<string, FluenceConfigSpell>;
  aquaImports?: Array<string>;
  cliVersion?: string;
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
      description:
        "(For advanced users) Overrides for the project dependencies",
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
      description:
        "Path to the aqua file or directory with aqua files that you want to compile by default. Must be relative to the project root dir",
    },
    aquaOutputTSPath: {
      type: "string",
      nullable: true,
      description:
        "Path to the default compilation target dir from aqua to ts. Must be relative to the project root dir",
    },
    aquaOutputJSPath: {
      type: "string",
      nullable: true,
      description:
        "Path to the default compilation target dir from aqua to js. Must be relative to the project root dir. Overrides 'aquaOutputTSPath' property",
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
    hosts: {
      description:
        "A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on",
      type: "object",
      nullable: true,
      additionalProperties: {
        type: "object",
        properties: {
          peerIds: {
            type: "array",
            description: "An array of peer IDs to deploy on",
            items: { type: "string" },
          },
        },
        required: ["peerIds"],
      },
      required: [],
    },
    workers: {
      nullable: true,
      description:
        "A Map with worker names as keys and worker configs as values",
      type: "object",
      additionalProperties: {
        type: "object",
        description: "Worker config",
        properties: {
          services: {
            description: `An array of service names to include in this worker. Service names must be listed in ${FLUENCE_CONFIG_FILE_NAME}`,
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
          spells: {
            description: `An array of spell names to include in this worker. Spell names must be listed in ${FLUENCE_CONFIG_FILE_NAME}`,
            type: "array",
            items: { type: "string" },
            nullable: true,
          },
        },
        required: [],
      },
      required: [],
    },
    deals: {
      description:
        "A map of objects with worker names as keys, each object defines a deal",
      type: "object",
      nullable: true,
      additionalProperties: {
        type: "object",
        properties: {
          minWorkers: {
            type: "number",
            description: "Required workers to activate the deal",
            default: MIN_WORKERS,
            nullable: true,
            minimum: 1,
          },
          targetWorkers: {
            type: "number",
            description: "Max workers in the deal",
            default: TARGET_WORKERS,
            nullable: true,
            minimum: 1,
          },
        },
        required: [],
      },
      required: [],
    },
    chainNetwork: {
      type: "string",
      description: "The network in which the transactions will be carried out",
      enum: CHAIN_NETWORKS,
      default: "testnet",
      nullable: true,
    },
    spells: {
      type: "object",
      nullable: true,
      description: "A map with spell names as keys and spell configs as values",
      additionalProperties: {
        type: "object",
        description: "Spell config",
        properties: {
          get: {
            type: "string",
            description: "Path to spell",
          },
          ...overridableSpellProperties,
        },
        required: ["get"],
      },
      required: [],
    },
    aquaImports: {
      type: "array",
      description: `A list of path to be considered by aqua compiler to be used as imports. First dependency in the list has the highest priority. Priority of imports is considered in the following order: imports from --import flags, imports from aquaImports property in ${FLUENCE_CONFIG_FILE_NAME}, project's ${join(
        DOT_FLUENCE_DIR_NAME,
        AQUA_DIR_NAME
      )} dir, npm dependencies from ${FLUENCE_CONFIG_FILE_NAME}, npm dependencies from user's ${join(
        DOT_FLUENCE_DIR_NAME,
        CONFIG_FILE_NAME
      )}, npm dependencies recommended by fluence`,
      items: { type: "string" },
      nullable: true,
    },
    cliVersion: {
      type: "string",
      description:
        "The version of the CLI that is compatible with this project. Set this to enforce a particular set of versions of all fluence components",
      nullable: true,
    },
  },
};

const getDefaultPeerId = (relays?: FluenceConfigReadonly["relays"]): string => {
  if (Array.isArray(relays)) {
    const firstRelay = relays[0];

    assert(
      firstRelay !== undefined,
      `relays array is empty in ${FLUENCE_CONFIG_FILE_NAME}`
    );

    return getPeerId(firstRelay);
  }

  // This typescript error happens only when running config docs generation script that's why type assertion is used
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unnecessary-type-assertion
  const fluenceEnv = (relays ?? process.env[FLUENCE_ENV]) as FluenceEnv;

  if (fluenceEnv === "local") {
    const localNode = local[0];
    assert(localNode !== undefined);
    return localNode.peerId;
  }

  return getRandomPeerId(fluenceEnv);
};

const DEFAULT_RELAYS_FOR_TEMPLATE: Relays =
  process.env[FLUENCE_ENV] === "local"
    ? localMultiaddrs
    : process.env[FLUENCE_ENV];

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
    projectRootDir,
    srcMainAquaPath
  );

  return {
    version: 2,
    [AQUA_INPUT_PATH_PROPERTY]: srcMainAquaPathRelative,
    workers: {
      [DEFAULT_WORKER_NAME]: {
        services: [],
      },
    },
    deals: {
      [DEFAULT_WORKER_NAME]: {
        minWorkers: MIN_WORKERS,
        targetWorkers: TARGET_WORKERS,
      },
    },
    hosts: {
      [DEFAULT_WORKER_NAME]: {
        peerIds: [getDefaultPeerId(DEFAULT_RELAYS_FOR_TEMPLATE)],
      },
    },
    relays: DEFAULT_RELAYS_FOR_TEMPLATE,
  };
};

const getDefault = (): Promise<LatestConfig> => {
  return initFluenceProject();
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);
const validateConfigSchemaV1 = ajv.compile(configSchemaV1);

const migrations: Migrations<Config> = [
  (config: Config): ConfigV1 => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${jsonStringify(
          validateConfigSchemaV0.errors
        )}`
      );
    }

    const services = config.services.reduce<Record<string, ServiceV1>>(
      (acc, { name, count = 1 }, i): Record<string, ServiceV1> => {
        return {
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
        };
      },
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

const checkDuplicatesAndPresence = (
  fluenceConfig: Pick<FluenceConfig, "workers" | "spells" | "services">,
  servicesOrSpells: "services" | "spells"
) => {
  if (fluenceConfig.workers === undefined) {
    return true;
  }

  const servicesOrSpellsSet = new Set(
    Object.keys(fluenceConfig[servicesOrSpells] ?? {}).flatMap(
      (serviceOrSpellName) => {
        return serviceOrSpellName;
      }
    )
  );

  return Object.entries(fluenceConfig.workers).reduce<string | true>(
    (acc, [workerName, workerConfig]) => {
      const workerServicesOrSpells = workerConfig[servicesOrSpells] ?? [];
      const workerServicesOrSpellsSet = new Set(workerServicesOrSpells);

      const notListedInFluenceYAML = workerServicesOrSpells.filter(
        (serviceName) => {
          return !servicesOrSpellsSet.has(serviceName);
        }
      );

      const maybePreviousError = typeof acc === "string" ? acc : null;

      const maybeNotListedError =
        notListedInFluenceYAML.length !== 0
          ? `Worker ${color.yellow(
              workerName
            )} has ${servicesOrSpells} that are not listed in ${color.yellow(
              "services"
            )} property in ${FLUENCE_CONFIG_FILE_NAME}: ${color.yellow(
              [...new Set(notListedInFluenceYAML)].join(", ")
            )}`
          : null;

      const maybeHasDuplicatesError =
        workerServicesOrSpellsSet.size !== workerServicesOrSpells.length
          ? `Worker ${color.yellow(
              workerName
            )} has duplicated ${servicesOrSpells} in ${FLUENCE_CONFIG_FILE_NAME}: ${color.yellow(
              workerServicesOrSpells.filter((serviceName, index) => {
                return workerServicesOrSpells.indexOf(serviceName) !== index;
              })
            )}`
          : null;

      const errors = [
        maybePreviousError,
        maybeNotListedError,
        maybeHasDuplicatesError,
      ].filter((error): error is string => {
        return error !== null;
      });

      return errors.length === 0 ? true : errors.join("\n");
    },
    true
  );
};

const validateWorkers = (
  fluenceConfig: Pick<FluenceConfig, "workers" | "spells" | "services">
) => {
  return validateBatch(
    checkDuplicatesAndPresence(fluenceConfig, "services"),
    checkDuplicatesAndPresence(fluenceConfig, "spells")
  );
};

const validateHostsAndDeals = (
  fluenceConfig: Pick<FluenceConfig, "hosts" | "deals" | "workers">,
  hostsOrDealsProperty: "hosts" | "deals"
) => {
  const hostsOrDeals = fluenceConfig[hostsOrDealsProperty];

  if (hostsOrDeals === undefined) {
    return true;
  }

  const workers = fluenceConfig["workers"];

  const workersSet = new Set(
    Object.keys(workers ?? {}).flatMap((serviceName) => {
      return serviceName;
    })
  );

  const workerNamesErrors = Object.keys(hostsOrDeals)
    .map((workerName) => {
      return workersSet.has(workerName)
        ? null
        : `Worker named ${color.yellow(workerName)} listed in ${color.yellow(
            hostsOrDealsProperty
          )} property must be listed in ${color.yellow(
            "workers"
          )} property in ${FLUENCE_CONFIG_FILE_NAME}`;
    })
    .filter((error): error is string => {
      return error !== null;
    });

  return workerNamesErrors.length === 0 ? true : workerNamesErrors.join("\n");
};

const validate: ConfigValidateFunction<LatestConfig> = (config) => {
  if (config.services === undefined) {
    return true;
  }

  const validity = validateBatch(
    validateWorkers(config),
    validateHostsAndDeals(config, "hosts"),
    validateHostsAndDeals(config, "deals"),
    validateAllVersionsAreExact(config.dependencies?.npm ?? {}),
    validateAllVersionsAreExact(config.dependencies?.cargo ?? {})
  );

  if (typeof validity === "string") {
    return validity;
  }

  // legacy deploy validation

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
      .map(({ serviceName, notUniqueDeployIds }): string => {
        return `${color.yellow(serviceName)}: ${[...notUniqueDeployIds].join(
          ", "
        )}`;
      })
      .join("\n")}`;
  }

  return true;
};

export const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1, configSchemaV2],
  latestSchema: configSchemaV2,
  migrations,
  name: FLUENCE_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: () => {
    return projectRootDir;
  },
  getSchemaDirPath: ensureFluenceDir,
  validate,
};

export const initFluenceConfigWithPath = async (
  path: string
): Promise<InitializedConfig<ConfigV2> | null> => {
  return getConfigInitFunction({
    ...initConfigOptions,
    getConfigOrConfigDirPath: () => {
      return path;
    },
  })();
};

export const initNewFluenceConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initFluenceConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyFluenceConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const fluenceSchema: JSONSchemaType<LatestConfig> = configSchemaV2;
