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
import path, { join } from "node:path";

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import CLIPackageJSON from "../../../versions/cli.package.json" assert { type: "json" };
import versions from "../../../versions.json" assert { type: "json" };
import { ajv, validationErrorToString } from "../../ajvInstance.js";
import { IPFS_ADDR_PROPERTY, DEFAULT_IPFS_ADDRESS } from "../../const.js";
import {
  MARINE_BUILD_ARGS_FLAG_NAME,
  MARINE_BUILD_ARGS_PROPERTY,
  DEFAULT_CHAIN_NETWORK,
  DEFAULT_WORKER_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  GLOBAL_CONFIG_FULL_FILE_NAME,
  DOT_FLUENCE_DIR_NAME,
  AQUA_DIR_NAME,
  MARINE_CARGO_DEPENDENCY,
  FLUENCE_CONFIG_FILE_NAME,
  CLI_NAME_FULL,
  CLI_NAME,
  DEFAULT_MARINE_BUILD_ARGS,
  type ContractsENV,
  CONTRACTS_ENV,
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
  ensureSrcAquaMainPath,
  getFluenceDir,
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

type ServiceV1 = {
  get: string;
  overrideModules?: OverrideModules;
};

type ConfigV1 = {
  version: 1;
  services?: Record<string, ServiceV1>;
  relays?: Relays;
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
  required: ["get"],
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
  minWorkers?: number;
  targetWorkers?: number;
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
} as const;

const dealSchema: JSONSchemaType<Deal> = {
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
} as const;

const validateDealSchema = ajv.compile(dealSchema);

const workerConfigSchema: JSONSchemaType<Worker> = {
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

const hostConfigSchema: JSONSchemaType<Host> = {
  type: "object",
  properties: {
    peerIds: {
      type: "array",
      description: "An array of peer IDs to deploy on",
      items: { type: "string" },
    },
  },
  required: ["peerIds"],
};

const validateHostsSchema = ajv.compile(hostConfigSchema);

export function assertIsArrayWithHostsOrDeals(
  unknownArr: [string, unknown][],
): asserts unknownArr is [string, Host | Deal][] {
  unknownArr.forEach(([, unknown]) => {
    assert(validateHostsSchema(unknown) || validateDealSchema(unknown));
  });
}

const configSchemaV2: JSONSchemaType<ConfigV2> = {
  ...configSchemaV1Obj,
  $id: `${TOP_LEVEL_SCHEMA_ID}/${FLUENCE_CONFIG_FULL_FILE_NAME}`,
  title: FLUENCE_CONFIG_FULL_FILE_NAME,
  description: `Defines Fluence Project, most importantly - what exactly you want to deploy and how. You can use \`${CLI_NAME} init\` command to generate a template for new Fluence project`,
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
          description: `A map of npm dependency versions. ${CLI_NAME_FULL} ensures dependencies are installed each time you run aqua`,
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
      description: `IPFS multiaddress to use when uploading workers with 'deal deploy'. Default: ${DEFAULT_IPFS_ADDRESS} (for 'workers deploy' IPFS address provided by relay that you are connected to is used)`,
      nullable: true,
      default: DEFAULT_IPFS_ADDRESS,
    },
  },
} as const;

const getDefaultPeerId = (relays?: FluenceConfigReadonly["relays"]): string => {
  if (Array.isArray(relays)) {
    const firstRelay = relays[0];

    assert(
      firstRelay !== undefined,
      `relays array is empty in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
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

const getConfigOrConfigDirPath = () => {
  return projectRootDir;
};

const getDefaultConfig = async (): Promise<string> => {
  return `# Defines Fluence Project
# Most importantly - what exactly you want to deploy and how
# You can use \`fluence init\` command to generate a template for new Fluence project

# A map with worker names as keys and worker configs as values
workers:
# # worker name
  ${DEFAULT_WORKER_NAME}:
    services: [] # list of service names to be deployed to this worker
    spells: [] # list of spell names to be deployed to this worker


# A map with worker names as keys and deals as values
deals:
# # worker name
  ${DEFAULT_WORKER_NAME}:
    minWorkers: ${MIN_WORKERS} # required amount of workers to activate the deal
    targetWorkers: ${TARGET_WORKERS} # max amount of workers in the deal


# Path to the aqua file or directory with aqua files that you want to compile by default.
# Must be relative to the project root dir
aquaInputPath: ${path.relative(projectRootDir, await ensureSrcAquaMainPath())}


# nox multiaddresses that will be used by cli to connect to the Fluence network.
# can be a list of multiaddresses or a name of the network.
relays: ${jsonStringify(DEFAULT_RELAYS_FOR_TEMPLATE)} # default: kras


# config version
version: 2

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
#         # Max size of the heap that a module can allocate in format:
#         # [number][whitespace?][specificator?]
#         # where ? is an optional field and specificator is one from the following (case-insensitive):
#         # K, Kb - kilobyte
#         # Ki, KiB - kibibyte
#         # M, Mb - megabyte
#         # Mi, MiB - mebibyte
#         # G, Gb - gigabyte
#         # Gi, GiB - gibibyte
#         # Current limit is 4 GiB
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
# # 4. npm dependencies from ${FLUENCE_CONFIG_FULL_FILE_NAME}
# # 5. npm dependencies from user's ${join(
    DOT_FLUENCE_DIR_NAME,
    GLOBAL_CONFIG_FULL_FILE_NAME,
  )}
# # 6. npm dependencies recommended by fluence
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
# # The network in which the transactions will be carried out
# chainNetwork: ${CONTRACTS_ENV[0]} # default: ${DEFAULT_CHAIN_NETWORK}
#
#
# # The version of the CLI that is compatible with this project.
# # You can set this to enforce a particular set of versions of all fluence components
# cliVersion: ${CLIPackageJSON.version}
#
#
# # (For advanced users) Overrides for the marine and mrepl dependencies and enumerates npm aqua dependencies
# # You can check out current project dependencies using \`fluence dep v\` command
# dependencies:
#   # A map of npm dependency versions
#   # CLI ensures dependencies are installed each time you run aqua
#   # There are also some dependencies that are installed by default (e.g. @fluencelabs/aqua-lib)
#   # You can check default dependencies using \`fluence dep v --default\`
#   # use \`fluence dep npm i\` to install project npm dependencies
#   npm:
#     "@fluencelabs/aqua-lib": ${versions.npm["@fluencelabs/aqua-lib"]}
#
#   # A map of cargo dependency versions
#   # CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL
#   # use \`fluence dep cargo i\` to install project cargo dependencies
#   cargo:
#     ${MARINE_CARGO_DEPENDENCY}: ${versions.cargo.marine}
#
# # if you want to deploy your services to specific peerIds. Soon it will be deprecated in favor of \`deals\` property
# hosts:
#   # worker name
#   ${DEFAULT_WORKER_NAME}:
#     peerIds:
#       - ${getDefaultPeerId(DEFAULT_RELAYS_FOR_TEMPLATE)}
# # Space separated \`cargo build\` flags and args to pass to marine build. Default: ${DEFAULT_MARINE_BUILD_ARGS}
# ${MARINE_BUILD_ARGS_PROPERTY}: '${DEFAULT_MARINE_BUILD_ARGS}'
# # IPFS multiaddress to use when uploading workers with 'deal deploy'. Default: ${DEFAULT_IPFS_ADDRESS} (for 'workers deploy' IPFS address provided by relay that you are connected to is used)
# ${IPFS_ADDR_PROPERTY}: '${DEFAULT_IPFS_ADDRESS}'
`;
};

const getDefault = (): Promise<string> => {
  return getDefaultConfig();
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);
const validateConfigSchemaV1 = ajv.compile(configSchemaV1);
const validateConfigSchemaV2 = ajv.compile(configSchemaV2);

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
            get: path.relative(
              projectRootDir,
              path.join(projectRootDir, "artifacts", name),
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
];

type Config = ConfigV0 | ConfigV1 | ConfigV2;
type LatestConfig = ConfigV2;
export type FluenceConfig = InitializedConfig<LatestConfig>;
export type FluenceConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const checkDuplicatesAndPresence = (
  fluenceConfig: Pick<FluenceConfig, "workers" | "spells" | "services">,
  servicesOrSpells: "services" | "spells",
) => {
  if (fluenceConfig.workers === undefined) {
    return true;
  }

  const servicesOrSpellsSet = new Set(
    Object.keys(fluenceConfig[servicesOrSpells] ?? {}).flatMap(
      (serviceOrSpellName) => {
        return serviceOrSpellName;
      },
    ),
  );

  return Object.entries(fluenceConfig.workers).reduce<string | true>(
    (acc, [workerName, workerConfig]) => {
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
    },
    true,
  );
};

const validateWorkers = (
  fluenceConfig: Pick<FluenceConfig, "workers" | "spells" | "services">,
) => {
  return validateBatch(
    checkDuplicatesAndPresence(fluenceConfig, "services"),
    checkDuplicatesAndPresence(fluenceConfig, "spells"),
  );
};

const validateHostsAndDeals = (
  fluenceConfig: Pick<FluenceConfig, "hosts" | "deals" | "workers">,
  hostsOrDealsProperty: "hosts" | "deals",
) => {
  const hostsOrDeals = fluenceConfig[hostsOrDealsProperty];

  if (hostsOrDeals === undefined) {
    return true;
  }

  const workers = fluenceConfig["workers"];

  const workersSet = new Set(
    Object.keys(workers ?? {}).flatMap((serviceName) => {
      return serviceName;
    }),
  );

  const workerNamesErrors = Object.keys(hostsOrDeals)
    .map((workerName) => {
      return workersSet.has(workerName)
        ? null
        : `Worker named ${color.yellow(workerName)} listed in ${color.yellow(
            hostsOrDealsProperty,
          )} property must be listed in ${color.yellow(
            "workers",
          )} property in ${FLUENCE_CONFIG_FULL_FILE_NAME}`;
    })
    .filter((error): error is string => {
      return error !== null;
    });

  return workerNamesErrors.length === 0 ? true : workerNamesErrors.join("\n");
};

const validate: ConfigValidateFunction<LatestConfig> = async (config) => {
  if (config.services === undefined) {
    return true;
  }

  const validity = validateBatch(
    validateWorkers(config),
    validateHostsAndDeals(config, "hosts"),
    validateHostsAndDeals(config, "deals"),
    await validateAllVersionsAreExact(config.dependencies?.npm ?? {}),
    await validateAllVersionsAreExact(config.dependencies?.cargo ?? {}),
  );

  if (typeof validity === "string") {
    return validity;
  }

  return true;
};

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1, configSchemaV2],
  latestSchema: configSchemaV2,
  migrations,
  name: FLUENCE_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath,
  getSchemaDirPath: getFluenceDir,
  validate,
};

export const initFluenceConfigWithPath = async (
  path: string,
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
  getDefault,
);
export const initFluenceConfig = getConfigInitFunction(initConfigOptions);
export const initReadonlyFluenceConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const fluenceSchema: JSONSchemaType<LatestConfig> = configSchemaV2;
