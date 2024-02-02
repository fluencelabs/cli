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
import { rm } from "node:fs/promises";
import { join, relative } from "node:path";

import { kras } from "@fluencelabs/fluence-network-environment";
import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";
import { yamlDiffPatch } from "yaml-diff-patch";

import CLIPackageJSON from "../../../versions/cli.package.json" assert { type: "json" };
import { versions } from "../../../versions.js";
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  COMPUTE_UNIT_MEMORY_STR,
  MAX_HEAP_SIZE_DESCRIPTION,
  AQUA_DIR_NAME,
  AQUA_LIB_NPM_DEPENDENCY,
  AUTO_GENERATED,
  CLI_NAME,
  CLI_NAME_FULL,
  CONTRACTS_ENV,
  type ContractsENV,
  CURRENCY_MULTIPLIER,
  DEFAULT_DEAL_NAME,
  DEFAULT_IPFS_ADDRESS,
  DEFAULT_MARINE_BUILD_ARGS,
  DOT_FLUENCE_DIR_NAME,
  FLUENCE_CONFIG_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  FLUENCE_ENVS,
  type FluenceEnv,
  GLOBAL_CONFIG_FULL_FILE_NAME,
  IPFS_ADDR_PROPERTY,
  LOCAL_IPFS_ADDRESS,
  MARINE_BUILD_ARGS_FLAG_NAME,
  MARINE_BUILD_ARGS_PROPERTY,
  PRICE_PER_EPOCH_DEFAULT,
  TOP_LEVEL_SCHEMA_ID,
  DEFAULT_INITIAL_BALANCE,
} from "../../const.js";
import {
  validateEffectors,
  validateVersionsIsExact,
  validateBatch,
} from "../../helpers/validations.js";
import { writeSecretKey } from "../../keyPairs.js";
import { resolveRelays } from "../../multiaddres.js";
import {
  ensureAquaMainPath,
  getFluenceDir,
  projectRootDir,
} from "../../paths.js";
import type { Mutable } from "../../typeHelpers.js";
import {
  type ConfigValidateFunction,
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

import {
  type OverridableModuleProperties,
  overridableModuleProperties,
} from "./module.js";
import { initReadonlyProjectSecretsConfig } from "./projectSecrets.js";
import {
  overridableServiceProperties,
  type OverridableServiceProperties,
} from "./service.js";
import {
  type OverridableSpellProperties,
  overridableSpellProperties,
} from "./spell.js";

export const TARGET_WORKERS_DEFAULT = 1;

type ServiceV0 = { name: string; count?: number };

type ConfigV0 = {
  version: 0;
  services: Array<ServiceV0>;
};

const configSchemaV0Obj = {
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
} as const;

const configSchemaV0: JSONSchemaType<ConfigV0> = configSchemaV0Obj;

export type OverrideModules = Record<string, OverridableModuleProperties>;

type ServiceV1 = {
  get: string;
  overrideModules?: OverrideModules;
} & OverridableServiceProperties;

type ConfigV1 = {
  version: 1;
  services?: Record<string, ServiceV1>;
  relays?: FluenceEnv | Array<string>;
};

const overrideModulesSchema: JSONSchemaType<OverridableModuleProperties> = {
  type: "object",
  title: "Module overrides",
  description: "Overrides for the module config",
  properties: {
    ...overridableModuleProperties,
  },
  required: [],
  nullable: true,
  additionalProperties: false,
} as const;

const serviceSchema: JSONSchemaType<ServiceV1> = {
  title: "Service config",
  description:
    "Service config. Defines where the service is and how to deploy it",
  type: "object",
  properties: {
    get: {
      type: "string",
      description: `Path to service directory or URL to the tar.gz archive with the service`,
    },
    ...overridableServiceProperties.properties,
    overrideModules: {
      type: "object",
      title: "Overrides",
      description: "A map of modules to override",
      additionalProperties: overrideModulesSchema,
      properties: {
        Module_name: overrideModulesSchema,
      },
      nullable: true,
      required: [],
    },
  },
  required: ["get", ...overridableServiceProperties.required],
  additionalProperties: false,
} as const;

const configSchemaV1Obj = {
  type: "object",
  properties: {
    services: {
      title: "Services",
      description: `A map with service names as keys and Service configs as values. You can have any number of services listed here as long as service name keys start with a lowercase letter and contain only letters numbers and underscores. You can use \`${CLI_NAME} service add\` command to add a service to this config`,
      type: "object",
      additionalProperties: serviceSchema,
      properties: {
        Service_name: serviceSchema,
      },
      required: [],
      nullable: true,
    },
    relays: {
      title: "Relays",
      description: `List of Fluence Peer multi addresses or a name of the network. This multi addresses are used for connecting to the Fluence network when deploying. Peer ids from these addresses are also used for deploying in case if you don't specify "peerId" or "peerIds" property in the deployment config. Default: ${FLUENCE_ENVS[0]}`,
      type: ["string", "array"],
      oneOf: [
        { type: "string", title: "Network name", enum: FLUENCE_ENVS },
        {
          type: "array",
          title: "Multi addresses",
          items: { type: "string" },
          minItems: 1,
        },
      ],
      nullable: true,
    },
    version: { type: "number", const: 1 },
  },
  required: ["version"],
} as const;

const configSchemaV1: JSONSchemaType<ConfigV1> = configSchemaV1Obj;

export const AQUA_INPUT_PATH_PROPERTY = "aquaInputPath";

type FluenceConfigSpell = {
  get: string;
} & OverridableSpellProperties;

type Deal = {
  computeUnits?: 1;
  minWorkers?: number;
  targetWorkers?: number;
  maxWorkersPerProvider?: number;
  pricePerWorkerEpoch?: number;
  initialBalance?: number;
  effectors?: string[];
};

type Worker = {
  services?: Array<string>;
  spells?: Array<string>;
};

type Host = { peerIds: Array<string> };

type ConfigV2 = Omit<ConfigV1, "version"> & {
  version: 2;
  dependencies?: {
    npm?: Record<string, string>;
    cargo?: Record<string, string>;
  };
  [AQUA_INPUT_PATH_PROPERTY]?: string;
  aquaOutputTSPath?: string;
  aquaOutputJSPath?: string;
  hosts?: Record<string, Host>;
  workers?: Record<string, Worker>;
  deals?: Record<string, Deal>;
  chainNetwork?: ContractsENV;
  spells?: Record<string, FluenceConfigSpell>;
  aquaImports?: Array<string>;
  cliVersion?: string;
  [MARINE_BUILD_ARGS_PROPERTY]?: string;
  [IPFS_ADDR_PROPERTY]?: string;
};

const spellSchema: JSONSchemaType<FluenceConfigSpell> = {
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
  additionalProperties: false,
} as const;

const dealSchemaObj = {
  type: "object",
  properties: {
    computeUnits: {
      type: "number",
      minimum: 1,
      maximum: 1,
      default: 1,
      description: `Number of compute units you require. 1 compute unit = ${COMPUTE_UNIT_MEMORY_STR}. Currently the only allowed value is 1. This will change in the future. Default: 1`,
      nullable: true,
    },
    targetWorkers: {
      type: "number",
      description: "Max workers in the deal",
      default: TARGET_WORKERS_DEFAULT,
      nullable: true,
      minimum: 1,
    },
    minWorkers: {
      type: "number",
      description:
        "Required workers to activate the deal. Matches target workers by default",
      nullable: true,
      minimum: 1,
    },
    maxWorkersPerProvider: {
      type: "number",
      description:
        "Max workers per provider. Matches target workers by default",
      nullable: true,
      minimum: 1,
    },
    pricePerWorkerEpoch: {
      type: "number",
      description: `Price per worker epoch in FLT`,
      default: PRICE_PER_EPOCH_DEFAULT,
      nullable: true,
      minimum: 1 / CURRENCY_MULTIPLIER,
    },
    initialBalance: {
      type: "number",
      description: `Initial balance after deploy in FLT`,
      default: DEFAULT_INITIAL_BALANCE,
      nullable: true,
    },
    effectors: {
      type: "array",
      description: "Effector to be used in the deal",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: [],
} as const satisfies JSONSchemaType<Deal>;

const dealSchema: JSONSchemaType<Deal> = dealSchemaObj;

const validateDealSchema = ajv.compile(dealSchema);

const workerConfigSchemaObj = {
  type: "object",
  description: "Worker config",
  properties: {
    services: {
      description: `An array of service names to include in this worker. Service names must be listed in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
    spells: {
      description: `An array of spell names to include in this worker. Spell names must be listed in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
      type: "array",
      items: { type: "string" },
      nullable: true,
    },
  },
  required: [],
} as const;

const workerConfigSchema: JSONSchemaType<Worker> = workerConfigSchemaObj;

const hostConfigSchemaObj = {
  type: "object",
  properties: {
    peerIds: {
      type: "array",
      description: "An array of peer IDs to deploy on",
      items: { type: "string" },
      minItems: 1,
    },
  },
  required: ["peerIds"],
} as const;

const hostConfigSchema: JSONSchemaType<Host> = hostConfigSchemaObj;

const validateHostsSchema = ajv.compile(hostConfigSchema);

export function assertIsArrayWithHostsOrDeals(
  unknownArr: [string, unknown][],
): asserts unknownArr is [string, Host | Deal][] {
  unknownArr.forEach(([, unknown]) => {
    assert(validateHostsSchema(unknown) || validateDealSchema(unknown));
  });
}

const configSchemaV2Obj = {
  ...configSchemaV1Obj,
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
          description: `A map of npm aqua dependency versions. ${CLI_NAME_FULL} ensures dependencies are installed each time you run aqua`,
          additionalProperties: { type: "string" },
          properties: {
            npm_dependency_name: {
              type: "string",
              description: "npm dependency version",
            },
          },
          required: [],
        },
        cargo: {
          type: "object",
          title: "Cargo dependencies",
          nullable: true,
          description: `A map of cargo dependency versions. ${CLI_NAME_FULL} ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL`,
          required: [],
          additionalProperties: { type: "string" },
          properties: {
            Cargo_dependency_name: {
              type: "string",
              description: "cargo dependency version",
            },
          },
        },
      },
      required: [],
      additionalProperties: false,
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
    hosts: {
      description:
        "A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on",
      type: "object",
      nullable: true,
      additionalProperties: hostConfigSchema,
      properties: {
        Worker_to_host: hostConfigSchema,
      },
      required: [],
    },
    workers: {
      nullable: true,
      description:
        "A Map with worker names as keys and worker configs as values",
      type: "object",
      additionalProperties: workerConfigSchema,
      properties: {
        Worker: workerConfigSchema,
      },
      required: [],
    },
    deals: {
      description:
        "A map of objects with worker names as keys, each object defines a deal",
      type: "object",
      nullable: true,
      additionalProperties: dealSchema,
      properties: {
        Worker_to_create_deal_for: dealSchema,
      },
      required: [],
    },
    chainNetwork: {
      type: "string",
      description: "The network in which the transactions will be carried out",
      enum: CONTRACTS_ENV,
      default: "testnet",
      nullable: true,
    },
    spells: {
      type: "object",
      nullable: true,
      description: "A map with spell names as keys and spell configs as values",
      additionalProperties: spellSchema,
      properties: {
        Spell_name: spellSchema,
      },
      required: [],
    },
    aquaImports: {
      type: "array",
      description: `A list of path to be considered by aqua compiler to be used as imports. First dependency in the list has the highest priority. Priority of imports is considered in the following order: imports from --import flags, imports from aquaImports property in ${FLUENCE_CONFIG_FULL_FILE_NAME}, project's ${join(
        DOT_FLUENCE_DIR_NAME,
        AQUA_DIR_NAME,
      )} dir, npm dependencies from ${FLUENCE_CONFIG_FULL_FILE_NAME}, npm dependencies from user's ${join(
        DOT_FLUENCE_DIR_NAME,
        GLOBAL_CONFIG_FULL_FILE_NAME,
      )}, npm dependencies recommended by fluence`,
      items: { type: "string" },
      nullable: true,
    },
    [MARINE_BUILD_ARGS_PROPERTY]: {
      type: "string",
      description: `Space separated \`cargo build\` flags and args to pass to marine build. Can be overridden using --${MARINE_BUILD_ARGS_FLAG_NAME} flag Default: ${DEFAULT_MARINE_BUILD_ARGS}`,
      nullable: true,
    },
    cliVersion: {
      type: "string",
      description: `The version of the ${CLI_NAME_FULL} that is compatible with this project. Set this to enforce a particular set of versions of all fluence components`,
      nullable: true,
    },
    [IPFS_ADDR_PROPERTY]: {
      type: "string",
      description: `IPFS multiaddress to use when uploading workers with 'deal deploy'. Default: ${DEFAULT_IPFS_ADDRESS} or ${LOCAL_IPFS_ADDRESS} if using local local env (for 'workers deploy' IPFS address provided by relay that you are connected to is used)`,
      nullable: true,
      default: DEFAULT_IPFS_ADDRESS,
    },
  },
} as const;

const configSchemaV2: JSONSchemaType<ConfigV2> = configSchemaV2Obj;

type ConfigV3 = Omit<ConfigV2, "version" | "relays" | "chainNetwork"> & {
  version: 3;
  customFluenceEnv?: {
    contractsEnv: ContractsENV;
    relays: Array<string>;
  };
};

const configSchemaV3Obj = {
  ...configSchemaV2Obj,
  properties: {
    ...(() => {
      const properties = {
        ...configSchemaV2Obj.properties,
      };

      // @ts-expect-error v3 deprecated relays property
      delete properties.relays;
      // @ts-expect-error v3 deprecated chainNetwork property
      delete properties.chainNetwork;
      return properties;
    })(),
    version: { type: "number", const: 3 },
    customFluenceEnv: {
      type: "object",
      description: `Custom Fluence environment to use when connecting to Fluence network`,
      nullable: true,
      properties: {
        contractsEnv: {
          type: "string",
          description: `Contracts environment to use for this fluence network to sign contracts on the blockchain`,
          enum: CONTRACTS_ENV,
        },
        relays: {
          type: "array",
          description: `List of custom relay multiaddresses to use when connecting to Fluence network`,
          items: { type: "string" },
          minItems: 1,
        },
      },
      required: ["contractsEnv", "relays"],
      additionalProperties: false,
    },
  },
} as const;

const configSchemaV3: JSONSchemaType<ConfigV3> = configSchemaV3Obj;

type RelayPath = string;

type ConfigV4 = Omit<ConfigV3, "version"> & {
  version: 4;
  defaultSecretKeyName?: string;
  relaysPath?: RelayPath | Array<RelayPath>;
};

const configSchemaV4Obj = {
  ...configSchemaV3Obj,
  properties: {
    ...configSchemaV3Obj.properties,
    version: { type: "number", const: 4 },
    defaultSecretKeyName: {
      description:
        "Secret key with this name will be used by default by js-client inside CLI to run Aqua code",
      type: "string",
      nullable: true,
    },
    relaysPath: {
      type: ["string", "array"],
      description:
        "Single or multiple paths to the directories where you want relays.json file to be generated. Must be relative to the project root dir. This file contains a list of relays to use when connecting to Fluence network and depends on the default environment that you use in your project",
      oneOf: [
        { type: "string" },
        {
          type: "array",
          items: { type: "string" },
          minItems: 1,
        },
      ],
      nullable: true,
    },
  },
} as const;

const configSchemaV4: JSONSchemaType<ConfigV4> = configSchemaV4Obj;

type ConfigV5 = Omit<ConfigV4, "workers" | "version" | "deals" | "hosts"> & {
  version: 5;
  deals?: Record<string, Deal & Worker>;
  hosts?: Record<string, Host & Worker>;
};

const configSchemaV4ObjPropertiesWithoutWorkers: Omit<
  typeof configSchemaV4Obj.properties,
  "workers"
> &
  Mutable<Partial<Pick<typeof configSchemaV4Obj.properties, "workers">>> = {
  ...configSchemaV4Obj.properties,
};

delete configSchemaV4ObjPropertiesWithoutWorkers.workers;

const configSchemaV5Obj = {
  ...configSchemaV4Obj,
  properties: {
    ...configSchemaV4ObjPropertiesWithoutWorkers,
    version: { type: "number", const: 5 },
    deals: {
      description:
        "A map of objects with worker names as keys, each object defines a deal",
      type: "object",
      nullable: true,
      additionalProperties: {
        ...workerConfigSchemaObj,
        additionalProperties: false,
        properties: {
          ...workerConfigSchemaObj.properties,
          ...dealSchemaObj.properties,
        },
      },
      properties: {
        dealName: {
          ...workerConfigSchemaObj,
          additionalProperties: false,
          properties: {
            ...workerConfigSchemaObj.properties,
            ...dealSchemaObj.properties,
          },
        },
      },
      required: [],
    },
    hosts: {
      description:
        "A map of objects with worker names as keys, each object defines a list of peer IDs to host the worker on. Intended to be used by providers to deploy directly without using the blockchain",
      type: "object",
      nullable: true,
      additionalProperties: {
        ...workerConfigSchemaObj,
        properties: {
          ...workerConfigSchemaObj.properties,
          ...hostConfigSchemaObj.properties,
        },
        additionalProperties: false,
      },
      properties: {
        workerName: {
          ...workerConfigSchemaObj,
          properties: {
            ...workerConfigSchemaObj.properties,
            ...hostConfigSchemaObj.properties,
          },
          additionalProperties: false,
        },
      },
      required: [],
    },
  },
  additionalProperties: false,
} as const;

const configSchemaV5: JSONSchemaType<ConfigV5> = configSchemaV5Obj;

type ConfigV6 = Omit<ConfigV5, "dependencies" | "version"> & {
  version: 6;
  aquaDependencies: Record<string, string>;
  marineVersion?: string;
  mreplVersion?: string;
};

const configSchemaV5ObjPropertiesWithoutDependencies: Omit<
  typeof configSchemaV5Obj.properties,
  "dependencies"
> &
  Mutable<Partial<Pick<typeof configSchemaV5Obj.properties, "dependencies">>> =
  {
    ...configSchemaV5Obj.properties,
  };

delete configSchemaV5ObjPropertiesWithoutDependencies.dependencies;

const configSchemaV6Obj = {
  ...configSchemaV5Obj,
  $id: `${TOP_LEVEL_SCHEMA_ID}/${FLUENCE_CONFIG_FULL_FILE_NAME}`,
  title: FLUENCE_CONFIG_FULL_FILE_NAME,
  description: `Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use \`${CLI_NAME} init\` command to generate a template for new Fluence project`,
  properties: {
    ...configSchemaV5ObjPropertiesWithoutDependencies,
    version: { type: "number", const: 6 },
    aquaDependencies: {
      description: "A map of npm aqua dependency versions",
      type: "object",
      additionalProperties: { type: "string" },
      properties: {
        "npm-aqua-dependency-name": {
          type: "string",
          description:
            "Valid npm dependency version specification (check out https://docs.npmjs.com/cli/v10/configuring-npm/package-json#dependencies)",
        },
      },
      required: [],
    },
    marineVersion: {
      type: "string",
      description: "Marine version",
      nullable: true,
    },
    mreplVersion: {
      type: "string",
      description: "Mrepl version",
      nullable: true,
    },
  },
  additionalProperties: false,
  required: [...configSchemaV5Obj.required, "aquaDependencies"],
} as const satisfies JSONSchemaType<ConfigV6>;

const configSchemaV6: JSONSchemaType<ConfigV6> = configSchemaV6Obj;

const getConfigOrConfigDirPath = () => {
  return projectRootDir;
};

const getDefaultConfig = async (): Promise<string> => {
  return `# Defines Fluence Project
# Most importantly - what exactly you want to deploy and how
# You can use \`fluence init\` command to generate a template for new Fluence project

# config version
version: 6

# Path to the aqua file or directory with aqua files that you want to compile by default.
# Must be relative to the project root dir
aquaInputPath: ${relative(projectRootDir, await ensureAquaMainPath())}

# A map with worker names as keys and deals as values
deals:
  ${DEFAULT_DEAL_NAME}:
    targetWorkers: ${TARGET_WORKERS_DEFAULT} # max amount of workers in the deal
    pricePerWorkerEpoch: ${PRICE_PER_EPOCH_DEFAULT} # price per worker epoch in FLT
    initialBalance: ${DEFAULT_INITIAL_BALANCE} # initial balance  after deploy in FLT
    services: [] # list of service names to be deployed to this worker
    spells: [] # list of spell names to be deployed to this worker

${yamlDiffPatch(
  "",
  {},
  {
    aquaDependencies: versions.npm,
  },
)}

# # A list of custom relay multiaddresses to use when connecting to Fluence network
# customFluenceEnv:
#   contractsEnv: local
#   relays:
#     - "${kras[0]?.multiaddr}"
# # A map with service names as keys and service configs as values.
# # Service names must start with a lowercase letter and contain only letters numbers and underscores.
# # You can use \`fluence service new\` or \`fluence service add\` command to add a service
# services:
#   # service name
#   myService:
#     # Path to service directory, service config or URL to the tar.gz archive that contains the service
#     get: "src/services/myService"
#     # A map of modules that you want to override for this service
#     overrideModules:
#       # module name
#       moduleName:
#         # environment variables accessible by a particular module
#         # with standard Rust env API like this: std::env::var(IPFS_ADDR_ENV_NAME)
#         # Module environment variables could be examined with repl
#         envs:
#           ENV_VARIABLE: "env variable string value"
#
#         # Set true to allow module to use the Marine SDK logger
#         loggerEnabled: true
#
#         # manages the logging targets, described in detail: https://fluence.dev/docs/marine-book/marine-rust-sdk/developing/logging#using-target-map
#         loggingMask: 1
#
#         # ${MAX_HEAP_SIZE_DESCRIPTION}
#         maxHeapSize: 1KiB
#
#         # A map of binary executable files that module is allowed to call
#         mountedBinaries:
#           curl: "/usr/bin/curl"
#
#         # A map of accessible files and their aliases.
#         # Aliases should be used in Marine module development because it's hard to know the full path to a file
#         volumes:
#           alias: "some/alias/path"
#
#
# # A map with spell names as keys and spell configs as values
# spells:
#   # spell name
#   mySpell:
#     # Path to spell config or directory with spell config
#     get: "src/spells/mySpell"
#
#     # overrides for the spell:
#
#     # Path to Aqua file which contains an Aqua function that you want to use as a spell
#     aquaFilePath: "src/spells/mySpell/spell.aqua"
#     # Name of the Aqua function that you want to use as a spell
#     function: main
#     # A map of Aqua function arguments names as keys and arguments values as values.
#     # These arguments will be passed to the spell function and will be stored in the key-value storage for this particular spell.
#     initArgs:
#       someArg: someArgStringValue
#     # Trigger the spell execution periodically
#     # If you want to disable this property by overriding it
#     # pass an empty config for it like this: \`clock: {}\`
#     clock:
#       # How often the spell will be executed.
#       # If set to 0, the spell will be executed only once.
#       # If this value not provided at all - the spell will never be executed
#       periodSec: 3
#       # How long to wait before the first execution in seconds.
#       # If this property or \`startTimestamp\` not specified, periodic execution will start immediately.
#       # WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server.
#       # If it is set to 0 - the spell will never be executed
#       # This property conflicts with \`startTimestamp\`. You can specify only one of them
#       startDelaySec: 1
#       # An ISO timestamp when the periodic execution should start.
#       # If this property or \`startDelaySec\` not specified, periodic execution will start immediately.
#       startTimestamp: '2023-07-06T23:59:59Z'
#       # How long to wait before the last execution in seconds.
#       # If this property or \`endTimestamp\` not specified, periodic execution will never end.
#       # WARNING! Currently your computer's clock is used to determine a final timestamp that is sent to the server.
#       # If it is in the past at the moment of spell creation - the spell will never be executed.
#       # This property conflicts with \`endTimestamp\`. You can specify only one of them
#       endDelaySec: 0
#       # An ISO timestamp when the periodic execution should end.
#       # If this property or \`endDelaySec\` not specified, periodic execution will never end.
#       # If it is in the past at the moment of spell creation on Rust peer - the spell will never be executed
#       endTimestamp: '2023-07-06T23:59:59Z'
#
#
# # A list of paths to be considered by aqua compiler to be used as imports.
# # First dependency in the list has the highest priority
# #
# # Priority of imports is considered in the following order:
# # 1. imports from --import flags,
# # 2. imports from aquaImports property in ${FLUENCE_CONFIG_FULL_FILE_NAME}
# # 3. project's ${join(DOT_FLUENCE_DIR_NAME, AQUA_DIR_NAME)} dir
# # 4. aqua dependencies from ${FLUENCE_CONFIG_FULL_FILE_NAME}
# aquaImports:
#   - "./node_modules"
#
#
# # Path to the default compilation target dir from aqua to ts
# # Must be relative to the project root dir
# aquaOutputTSPath: "src/ts/src/aqua"
#
#
# # Path to the default compilation target dir from aqua to js
# # Must be relative to the project root dir
# # Overrides 'aquaOutputTSPath' property
# aquaOutputJSPath: "src/js/src/aqua"
#
#
# # The version of the CLI that is compatible with this project.
# # You can set this to enforce a particular set of versions of all fluence components
# cliVersion: ${CLIPackageJSON.version}
#
# # A map of npm aqua dependency versions
# # CLI ensures dependencies are installed each time you run aqua
# # There are also some dependencies that are installed by default (e.g. ${AQUA_LIB_NPM_DEPENDENCY})
# # You can check default dependencies using \`fluence dep v --default\`
# # use \`fluence dep i\` to install project aqua dependencies
# aquaDependencies:
#   "${AQUA_LIB_NPM_DEPENDENCY}": ${versions.npm[AQUA_LIB_NPM_DEPENDENCY]}
#
# # CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL
# # use \`fluence dep i\` to install marine and mrepl
# marineVersion: ${versions.cargo.marine}
# mreplVersion: ${versions.cargo.mrepl}
#
# # If you want to deploy your services to specific peerIds. Intended to be used by providers to deploy directly without using the blockchain
# hosts:
#   # worker name
#   ${DEFAULT_DEAL_NAME}:
#     peerIds: []
#     services: [] # list of service names to be deployed to this worker
#     spells: [] # list of spell names to be deployed to this worker
# # Space separated \`cargo build\` flags and args to pass to marine build. Default: ${DEFAULT_MARINE_BUILD_ARGS}
# ${MARINE_BUILD_ARGS_PROPERTY}: '${DEFAULT_MARINE_BUILD_ARGS}'
# # IPFS multiaddress to use when uploading workers with 'deal deploy'. Default: ${DEFAULT_IPFS_ADDRESS} or ${LOCAL_IPFS_ADDRESS} if using local local env (for 'workers deploy' IPFS address provided by relay that you are connected to is used)
# ${IPFS_ADDR_PROPERTY}: '${DEFAULT_IPFS_ADDRESS}'
# # Secret key with this name will be used by default by js-client inside CLI to run Aqua code
# defaultSecretKeyName: ${AUTO_GENERATED}
# # Path to the directory where you want relays.json file to be generated. Must be relative to the project root dir. This file contains a list of relays to use when connecting to Fluence network and depends on the default environment that you use in your project
# relaysPath: relative/path
`;
};

const getDefault = (): Promise<string> => {
  return getDefaultConfig();
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);
const validateConfigSchemaV1 = ajv.compile(configSchemaV1);
const validateConfigSchemaV2 = ajv.compile(configSchemaV2);
const validateConfigSchemaV3 = ajv.compile(configSchemaV3);
const validateConfigSchemaV4 = ajv.compile(configSchemaV4);
const validateConfigSchemaV5 = ajv.compile(configSchemaV5);

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    const services = config.services.reduce<Record<string, ServiceV1>>(
      (acc, { name }): Record<string, ServiceV1> => {
        return {
          ...acc,
          [name]: {
            get: relative(
              projectRootDir,
              join(projectRootDir, "artifacts", name),
            ),
          },
        };
      },
      {},
    );

    return {
      version: 1,
      services,
    };
  },
  async (config: Config): Promise<ConfigV2> => {
    if (!validateConfigSchemaV1(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV1.errors,
        )}`,
      );
    }

    const { parse } = await import("yaml");
    const parsedConfig: unknown = parse(await getDefaultConfig());
    assert(validateConfigSchemaV2(parsedConfig));

    return {
      ...config,
      ...parsedConfig,
    };
  },
  async (config: Config): Promise<ConfigV3> => {
    if (!validateConfigSchemaV2(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV2.errors,
        )}`,
      );
    }

    const { relays, chainNetwork, ...restConfig } = config;

    let customFluenceEnv: ConfigV3["customFluenceEnv"] | undefined;

    // if some kind of custom network was previously set - migrate it to the new format
    if (Array.isArray(relays) || chainNetwork !== undefined) {
      customFluenceEnv = {
        contractsEnv: chainNetwork ?? "testnet",
        relays:
          relays === undefined || typeof relays === "string"
            ? await resolveRelays({
                fluenceEnv: relays ?? "kras",
                maybeFluenceConfig: null,
              })
            : relays,
      };
    }

    return {
      ...restConfig,
      ...(customFluenceEnv === undefined ? {} : customFluenceEnv),
      version: 3,
    };
  },
  async (config: Config): Promise<ConfigV4> => {
    if (!validateConfigSchemaV3(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV3.errors,
        )}`,
      );
    }

    const projectSecretsConfig = await initReadonlyProjectSecretsConfig();

    await Promise.all(
      (projectSecretsConfig?.keyPairs ?? []).map(({ name, secretKey }) => {
        return writeSecretKey({
          name,
          secretKey,
          isUser: false,
        });
      }),
    );

    if (projectSecretsConfig !== null) {
      await rm(projectSecretsConfig.$getPath());
    }

    return {
      ...config,
      version: 4,
      ...(projectSecretsConfig?.defaultKeyPairName === undefined
        ? {}
        : { defaultSecretKeyName: projectSecretsConfig.defaultKeyPairName }),
    };
  },
  async (config: Config): Promise<ConfigV5> => {
    if (!validateConfigSchemaV4(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV4.errors,
        )}`,
      );
    }

    const { workers, ...restConfig } = config;

    const res: ConfigV5 = {
      ...restConfig,
      version: 5,
    };

    if (res.hosts !== undefined) {
      res.hosts = Object.fromEntries(
        Object.entries(res.hosts).map(([k, v]) => {
          const worker = workers?.[k] ?? {};
          return [k, { ...v, ...worker }] as const;
        }),
      );
    }

    if (res.deals !== undefined) {
      res.deals = Object.fromEntries(
        Object.entries(res.deals).map(([k, v]) => {
          const worker = workers?.[k] ?? {};
          return [k, { ...v, ...worker }] as const;
        }),
      );
    }

    return res;
  },
  async (config: Config): Promise<ConfigV6> => {
    if (!validateConfigSchemaV5(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV5.errors,
        )}`,
      );
    }

    const { dependencies, ...restConfig } = config;
    const marine = dependencies?.cargo?.["marine"];
    const mrepl = dependencies?.cargo?.["mrepl"];

    const res: ConfigV6 = {
      ...restConfig,
      version: 6,
      aquaDependencies: dependencies?.npm ?? versions.npm,
      ...(marine === undefined ? {} : { marineVersion: marine }),
      ...(mrepl === undefined ? {} : { mreplVersion: mrepl }),
    };

    return res;
  },
];

type Config =
  | ConfigV0
  | ConfigV1
  | ConfigV2
  | ConfigV3
  | ConfigV4
  | ConfigV5
  | ConfigV6;
type LatestConfig = ConfigV6;
export type FluenceConfig = InitializedConfig<LatestConfig>;
export type FluenceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;
export type FluenceConfigWithServices = FluenceConfig & {
  services: NonNullable<FluenceConfig["services"]>;
};

export function isFluenceConfigWithServices(
  config: FluenceConfig,
): config is FluenceConfigWithServices {
  return "services" in config;
}

const checkDuplicatesAndPresence = (
  fluenceConfig: Pick<FluenceConfig, "spells" | "services" | "hosts" | "deals">,
  servicesOrSpells: "services" | "spells",
) => {
  const servicesOrSpellsSet = new Set(
    Object.keys(fluenceConfig[servicesOrSpells] ?? {}).flatMap(
      (serviceOrSpellName) => {
        return serviceOrSpellName;
      },
    ),
  );

  const hostsValidity = Object.entries(fluenceConfig.hosts ?? {}).reduce<
    string | true
  >((acc, [workerName, workerConfig]) => {
    return checkDuplicatesAndPresenceImplementation({
      workerConfig,
      servicesOrSpells,
      servicesOrSpellsSet,
      acc,
      workerName,
    });
  }, true);

  if (typeof hostsValidity === "string") {
    return hostsValidity;
  }

  return Object.entries(fluenceConfig.deals ?? {}).reduce<string | true>(
    (acc, [workerName, workerConfig]) => {
      return checkDuplicatesAndPresenceImplementation({
        workerConfig,
        servicesOrSpells,
        servicesOrSpellsSet,
        acc,
        workerName,
      });
    },
    true,
  );
};

type CheckDuplicatesAndPresenceImplementationArgs = {
  workerConfig: Deal & Worker;
  servicesOrSpells: "services" | "spells";
  servicesOrSpellsSet: Set<string>;
  acc: string | boolean;
  workerName: string;
};

function checkDuplicatesAndPresenceImplementation({
  workerConfig,
  servicesOrSpells,
  servicesOrSpellsSet,
  acc,
  workerName,
}: CheckDuplicatesAndPresenceImplementationArgs) {
  const workerServicesOrSpells = workerConfig[servicesOrSpells] ?? [];
  const workerServicesOrSpellsSet = new Set(workerServicesOrSpells);

  const notListedInFluenceYAML = workerServicesOrSpells.filter(
    (serviceName) => {
      return !servicesOrSpellsSet.has(serviceName);
    },
  );

  const maybePreviousError = typeof acc === "string" ? acc : null;

  const maybeNotListedError =
    notListedInFluenceYAML.length !== 0
      ? `Worker ${color.yellow(
          workerName,
        )} has ${servicesOrSpells} that are not listed in ${color.yellow(
          "services",
        )} property in ${FLUENCE_CONFIG_FULL_FILE_NAME}: ${color.yellow(
          [...new Set(notListedInFluenceYAML)].join(", "),
        )}`
      : null;

  const maybeHasDuplicatesError =
    workerServicesOrSpellsSet.size !== workerServicesOrSpells.length
      ? `Worker ${color.yellow(
          workerName,
        )} has duplicated ${servicesOrSpells} in ${FLUENCE_CONFIG_FULL_FILE_NAME}: ${color.yellow(
          workerServicesOrSpells.filter((serviceName, index) => {
            return workerServicesOrSpells.indexOf(serviceName) !== index;
          }),
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
}

const validateWorkers = (
  fluenceConfig: Pick<FluenceConfig, "spells" | "services">,
) => {
  return validateBatch(
    checkDuplicatesAndPresence(fluenceConfig, "services"),
    checkDuplicatesAndPresence(fluenceConfig, "spells"),
  );
};

const validate: ConfigValidateFunction<LatestConfig> = async (config) => {
  return validateBatch(
    validateWorkers(config),
    await validateEffectors(
      Object.entries(config.deals ?? {}).flatMap(([name, { effectors }]) => {
        return (effectors ?? []).map((effector) => {
          return {
            effector,
            location: `${FLUENCE_CONFIG_FULL_FILE_NAME} > deals > ${name} > effectors > ${effector}`,
          };
        });
      }),
    ),
    await validateVersionsIsExact("marineVersion", config.marineVersion),
    await validateVersionsIsExact("mreplVersion", config.mreplVersion),
  );
};

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [
    configSchemaV0,
    configSchemaV1,
    configSchemaV2,
    configSchemaV3,
    configSchemaV4,
    configSchemaV5,
    configSchemaV6,
  ],
  latestSchema: configSchemaV6,
  migrations,
  name: FLUENCE_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath,
  getSchemaDirPath: getFluenceDir,
  validate,
};

export const initFluenceConfigWithPath = async (
  path: string,
): Promise<InitializedConfig<LatestConfig> | null> => {
  return getConfigInitFunction({
    ...initConfigOptions,
    getConfigOrConfigDirPath: () => {
      return path;
    },
  })();
};

export const initReadonlyFluenceConfigWithPath = async (
  path: string,
): Promise<InitializedReadonlyConfig<LatestConfig> | null> => {
  return getReadonlyConfigInitFunction({
    ...initConfigOptions,
    getConfigOrConfigDirPath: () => {
      return path;
    },
  })();
};

export const initNewFluenceConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault,
);
export const initFluenceConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyFluenceConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const fluenceSchema: JSONSchemaType<LatestConfig> = configSchemaV6;
