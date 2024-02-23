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

import { join } from "node:path";

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";
import type {
  Flag,
  OutputFlags,
  ParserOutput,
} from "@oclif/core/lib/interfaces/parser.js";
import camelCase from "lodash-es/camelCase.js";
import upperFirst from "lodash-es/upperFirst.js";
import xbytes from "xbytes";

import { LOCAL_NET_DEFAULT_WALLET_KEY } from "./accounts.js";
import { aquaComment } from "./helpers/utils.js";
import { getIsStringUnion } from "./typeHelpers.js";

export const CLI_NAME = "fluence";
export const CLI_NAME_FULL = "Fluence CLI";
const GITHUB_REPO_NAME = "https://github.com/fluencelabs/cli";
export const NODE_JS_MAJOR_VERSION = 18;
export const DEFAULT_IPFS_ADDRESS = "/dns4/ipfs.fluence.dev/tcp/5001";

export const RUST_WASM32_WASI_TARGET = "wasm32-wasi";

export const DEFAULT_MARINE_BUILD_ARGS = `--release`;

export const numberProperties = ["minPricePerWorkerEpoch"] as const;

export type NumberProperty = (typeof numberProperties)[number];

const CURRENCY_MULTIPLIER_POWER = 18;
export const CURRENCY_MULTIPLIER = 10 ** CURRENCY_MULTIPLIER_POWER;
export const COLLATERAL_DEFAULT = 1;
export const PRICE_PER_EPOCH_DEFAULT = 0.00001;
export const DEFAULT_INITIAL_BALANCE = 0.001;

export const defaultNumberProperties: Record<NumberProperty, number> = {
  minPricePerWorkerEpoch: PRICE_PER_EPOCH_DEFAULT,
};

export const MIN_MEMORY_PER_MODULE_STR = "2 MiB";
export const MIN_MEMORY_PER_MODULE = xbytes.parseSize(
  MIN_MEMORY_PER_MODULE_STR,
);

export const COMPUTE_UNIT_MEMORY_STR = "2GB";
export const COMPUTE_UNIT_MEMORY = xbytes.parseSize(COMPUTE_UNIT_MEMORY_STR);

const byteUnits = [
  "kB",
  "KB",
  "kiB",
  "KiB",
  "KIB",
  "mB",
  "MB",
  "miB",
  "MiB",
  "MIB",
  "gB",
  "GB",
  "giB",
  "GiB",
  "GIB",
];

export const BYTES_PATTERN = `^\\d+(\\.\\d+)?(\\s?)(${byteUnits.join("|")})$`;
export const BYTES_FORMAT = `[number][whitespace?][B] where ? is an optional field and B is one of the following: ${byteUnits.join(
  ", ",
)}`;
export const MAX_HEAP_SIZE_DESCRIPTION = `DEPRECATED. Use \`totalMemoryLimit\` service property instead. Max size of the heap that a module can allocate in format: ${BYTES_FORMAT}`;

export const U32_MAX = 4_294_967_295;

export const DEFAULT_NUMBER_OF_COMPUTE_UNITS_ON_NOX = 32;

export const PUBLIC_FLUENCE_ENV = ["dar", "stage", "kras"] as const;
export type PublicFluenceEnv = (typeof PUBLIC_FLUENCE_ENV)[number];
export const isPublicFluenceEnv = getIsStringUnion(PUBLIC_FLUENCE_ENV);

export const CHAIN_ENV = [...PUBLIC_FLUENCE_ENV, "local"] as const;
export type ChainENV = (typeof CHAIN_ENV)[number];
export const isChainEnv = getIsStringUnion(CHAIN_ENV);

export type ChainConfig = {
  url: string;
  id: number;
};

export const CLI_CONNECTOR_URL = "https://cli-connector.fluence.dev";
export const WC_PROJECT_ID = "70c1c5ed2a23e7383313de1044ddce7e";
export const WC_METADATA = {
  name: CLI_NAME,
  description: `${CLI_NAME_FULL} is designed to be the only tool that you need to manage the life cycle of applications written on Fluence.`,
  url: GITHUB_REPO_NAME,
  icons: [],
};

export const FLUENCE_ENVS = [...CHAIN_ENV, "custom"] as const;
export type FluenceEnv = (typeof FLUENCE_ENVS)[number];
export const isFluenceEnv = getIsStringUnion(FLUENCE_ENVS);

export const CHAIN_URLS: Record<ChainENV, string> = {
  kras: "https://ipc-kras.fluence.dev",
  dar: "https://ipc-dar.fluence.dev",
  stage: "https://ipc-stage.fluence.dev",
  local: "http://127.0.0.1:8545",
};

export const IPFS_CONTAINER_NAME = "ipfs";
export const IPFS_PORT = 5001;
export const GRAPH_NODE_CONTAINER_NAME = "graph-node";
export const GRAPH_NODE_PORT = 8020;
export const POSTGRES_CONTAINER_NAME = "postgres";
export const LOCAL_IPFS_ADDRESS = `/ip4/127.0.0.1/tcp/${IPFS_PORT}`;
export const CHAIN_RPC_CONTAINER_NAME = "chain-rpc";
export const CHAIN_RPC_PORT = 8545;
export const CHAIN_DEPLOY_SCRIPT_NAME = "chain-deploy-script";
export const SUBGRAPH_DEPLOY_SCRIPT_NAME = "subgraph-deploy-script";
export const TCP_PORT_START = 7771;
export const WEB_SOCKET_PORT_START = 9991;
export const HTTP_PORT_START = 18080;
export const DEFAULT_AQUAVM_POOL_SIZE = 2;

export const AQUA_EXT = "aqua";
export const TS_EXT = "ts";
export const JS_EXT = "js";
export const JSON_EXT = "json";
export const YAML_EXT = "yaml";
export const YML_EXT = "yml";
export const WASM_EXT = "wasm";
export const TOML_EXT = "toml";

export const DOT_FLUENCE_DIR_NAME = ".fluence";
export const AQUA_DEPENDENCIES_DIR_NAME = "aqua-dependencies";
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const FRONTEND_DIR_NAME = "frontend";
export const GATEWAY_DIR_NAME = "gateway";
export const TMP_DIR_NAME = "tmp";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";
export const AQUA_DIR_NAME = "aqua";
export const COMPILED_AQUA_DIR_NAME = "compiled-aqua";
export const MODULES_DIR_NAME = "modules";
export const SERVICES_DIR_NAME = "services";
export const SPELLS_DIR_NAME = "spells";
export const NPM_DIR_NAME = "npm";
export const CARGO_DIR_NAME = "cargo";
export const BIN_DIR_NAME = "bin";
export const COUNTLY_DIR_NAME = "countly";
export const SECRETS_DIR_NAME = "secrets";
export const CONFIGS_DIR_NAME = "configs";

export const FLUENCE_CONFIG_FILE_NAME = `fluence`;
export const PROVIDER_CONFIG_FILE_NAME = `provider`;
export const PROVIDER_SECRETS_CONFIG_FILE_NAME = `provider-secrets`;
export const PROVIDER_ARTIFACTS_CONFIG_FILE_NAME = `provider-artifacts`;
export const WORKERS_CONFIG_FILE_NAME = `workers`;
export const PROJECT_SECRETS_CONFIG_FILE_NAME = `project-secrets`;
export const USER_SECRETS_CONFIG_FILE_NAME = `user-secrets`;
export const GLOBAL_CONFIG_FILE_NAME = `config`;
export const MODULE_CONFIG_FILE_NAME = `module`;
export const SERVICE_CONFIG_FILE_NAME = `service`;
export const SPELL_CONFIG_FILE_NAME = `spell`;
export const ENV_CONFIG_FILE_NAME = `env`;
export const DOCKER_COMPOSE_FILE_NAME = `docker-compose`;

export const FLUENCE_CONFIG_FULL_FILE_NAME = `${FLUENCE_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const PROVIDER_CONFIG_FULL_FILE_NAME = `${PROVIDER_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const PROVIDER_SECRETS_CONFIG_FULL_FILE_NAME = `${PROVIDER_SECRETS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const PROVIDER_ARTIFACTS_CONFIG_FULL_FILE_NAME = `${PROVIDER_ARTIFACTS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const WORKERS_CONFIG_FULL_FILE_NAME = `${WORKERS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const PROJECT_SECRETS_FULL_CONFIG_FILE_NAME = `${PROJECT_SECRETS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const USER_SECRETS_CONFIG_FULL_FILE_NAME = `${USER_SECRETS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const GLOBAL_CONFIG_FULL_FILE_NAME = `${GLOBAL_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const MODULE_CONFIG_FULL_FILE_NAME = `${MODULE_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const SERVICE_CONFIG_FULL_FILE_NAME = `${SERVICE_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const SPELL_CONFIG_FULL_FILE_NAME = `${SPELL_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const ENV_CONFIG_FULL_FILE_NAME = `${ENV_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const DOCKER_COMPOSE_FULL_FILE_NAME = `${DOCKER_COMPOSE_FILE_NAME}.${YAML_EXT}`;

export const MAIN_AQUA_FILE_NAME = `main.${AQUA_EXT}`;
export const AQUA_SERVICES_FILE_NAME = `services.${AQUA_EXT}`;
export const DEALS_FILE_NAME = "deals";
export const DEALS_FULL_FILE_NAME = `${DEALS_FILE_NAME}.${AQUA_EXT}`;
export const HOSTS_FILE_NAME = "hosts";
export const HOSTS_FULL_FILE_NAME = `${HOSTS_FILE_NAME}.${AQUA_EXT}`;
export const SPELL_AQUA_FILE_NAME = `spell.${AQUA_EXT}`;

export const GITIGNORE_FILE_NAME = ".gitignore";

export const PACKAGE_JSON_FILE_NAME = `package.${JSON_EXT}`;
export const TS_CONFIG_FILE_NAME = `tsconfig.${JSON_EXT}`;
export const EXTENSIONS_JSON_FILE_NAME = `extensions.${JSON_EXT}`;

export const INDEX_TS_FILE_NAME = `index.${TS_EXT}`;
export const INDEX_JS_FILE_NAME = `index.${JS_EXT}`;
export const INDEX_HTML_FILE_NAME = `index.html`;

export const SERVER_TS_FILE_NAME = `server.${TS_EXT}`;
export const SERVER_JS_FILE_NAME = `server.${JS_EXT}`;

export const CONFIG_TOML = `Config.${TOML_EXT}`;
export const CARGO_TOML = `Cargo.${TOML_EXT}`;

export const README_MD_FILE_NAME = `README.md`;

export const FS_OPTIONS = {
  encoding: "utf8",
} as const;

export const TOP_LEVEL_SCHEMA_ID = "https://fluence.dev/schemas";

export const AUTO_GENERATED = "auto-generated";
export const DEFAULT_DEPLOYMENT_NAME = "myDeployment";
export const DEFAULT_WORKER_NAME = "workerName";

export const NO_INPUT_FLAG_NAME = "no-input";
export const NO_INPUT_FLAG = {
  [NO_INPUT_FLAG_NAME]: Flags.boolean({
    default: false,
    description: "Don't interactively ask for any input from the user",
  }),
} as const;

const fluenceEnvFlagAndArg = {
  description: "Fluence Environment to use when running the command",
  helpValue: `<${FLUENCE_ENVS.join(" | ")}>`,
};

export const ENV_FLAG_NAME = "env";
export const ENV_FLAG = {
  [ENV_FLAG_NAME]: Flags.string(fluenceEnvFlagAndArg),
};

export const ENV_ARG_NAME = "ENV";
export const ENV_ARG = {
  [ENV_ARG_NAME]: Args.string(fluenceEnvFlagAndArg),
};

export const OFF_AQUA_LOGS_FLAG = {
  "off-aqua-logs": Flags.boolean({
    default: false,
    description:
      "Turns off logs from Console.print in aqua and from IPFS service",
  }),
};

export const USE_F64_FLAG = {
  f64: Flags.boolean({
    default: false,
    description:
      "Convert all numbers to f64. Useful for arrays objects that contain numbers of different types in them. Without this flag, numbers will be converted to u64, i64 or f64 depending on their value",
  }),
};

export const CUSTOM_TYPES_FLAG = {
  types: Flags.string({
    description:
      "Experimental! Path to a file with custom types. Must be a list with objects that have 'name' and 'properties'. 'properties' must be a list of all custom type properties",
    helpValue: "<path>",
  }),
};

export const NO_BUILD_FLAG = {
  "no-build": Flags.boolean({
    default: false,
    description: "Don't build the project before running the command",
  }),
};

export const IMPORT_FLAG = {
  import: Flags.string({
    description:
      "Path to a directory to import aqua files from. May be used several times",
    helpValue: "<path>",
    multiple: true,
  }),
};

export const TRACING_FLAG = {
  tracing: Flags.boolean({
    description: "Compile aqua in tracing mode (for debugging purposes)",
    default: false,
  }),
};

export const ALL_FLAG_VALUE = "all";

export const NOX_NAMES_FLAG_NAME = "nox-names";
export const NOX_NAMES_FLAG_CONFIG = {
  description: `Comma-separated names of noxes from ${PROVIDER_CONFIG_FULL_FILE_NAME}. To use all of your noxes: --${NOX_NAMES_FLAG_NAME} ${ALL_FLAG_VALUE}`,
  helpValue: "<nox-1,nox-2>",
};
export const NOX_NAMES_FLAG = {
  [NOX_NAMES_FLAG_NAME]: Flags.string(NOX_NAMES_FLAG_CONFIG),
};

export const LOG_LEVEL_COMPILER_FLAG_NAME = "log-level-compiler";

export const AQUA_LOG_LEVELS = [
  "all",
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "off",
] as const;

export type AquaLogLevel = (typeof AQUA_LOG_LEVELS)[number];
export const isAquaLogLevel = getIsStringUnion(AQUA_LOG_LEVELS);

export const aquaLogLevelsString = `Must be one of: ${AQUA_LOG_LEVELS.join(
  ", ",
)}`;

export const INPUT_FLAG_NAME = "input";
export const COMPILE_AQUA_PROPERTY_NAME = "compileAqua";
export const INPUT_FLAG_EXPLANATION = `. If --${INPUT_FLAG_NAME} flag is used - then content of '${COMPILE_AQUA_PROPERTY_NAME}' property in ${FLUENCE_CONFIG_FULL_FILE_NAME} will be ignored`;

export const COMMON_AQUA_COMPILATION_FLAGS = {
  ...IMPORT_FLAG,
  [INPUT_FLAG_NAME]: Flags.string({
    description:
      "Path to an aqua file or a directory that contains your aqua files",
    helpValue: "<path>",
    char: "i",
  }),
  const: Flags.string({
    description: "Constants to be passed to the compiler",
    helpValue: "<NAME=value>",
    multiple: true,
  }),
  [LOG_LEVEL_COMPILER_FLAG_NAME]: Flags.string({
    description: `Set log level for the compiler. ${aquaLogLevelsString}`,
    helpValue: "<level>",
  }),
  "no-relay": Flags.boolean({
    default: false,
    description: "Do not generate a pass through the relay node",
  }),
  "no-xor": Flags.boolean({
    default: false,
    description: "Do not generate a wrapper that catches and displays errors",
  }),
  ...TRACING_FLAG,
  "no-empty-response": Flags.boolean({
    default: false,
    description:
      "Do not generate response call if there are no returned values",
  }),
} as const;

export type CommonAquaCompilationFlags = FromFlagsDef<
  typeof COMMON_AQUA_COMPILATION_FLAGS
>;

export const NOXES_FLAG = {
  noxes: Flags.integer({
    description: `Number of Compute Peers to generate when a new ${PROVIDER_CONFIG_FULL_FILE_NAME} is created`,
  }),
};

export const OFFER_FLAG_NAME = "offer";
export const OFFER_IDS_FLAG_NAME = "offer-ids";

const OFFER_FLAG_OBJECT = {
  description: `Comma-separated list of offer names. Can't be used together with --${OFFER_IDS_FLAG_NAME}. To use all of your offers: --${OFFER_FLAG_NAME} ${ALL_FLAG_VALUE}`,
  helpValue: "<offer-1,offer-2>",
};

export const OFFER_FLAG = {
  [OFFER_FLAG_NAME]: Flags.string(OFFER_FLAG_OBJECT),
};

export const OFFER_FLAGS = {
  [OFFER_FLAG_NAME]: Flags.string({
    ...OFFER_FLAG_OBJECT,
    exclusive: [OFFER_IDS_FLAG_NAME],
  }),
  [OFFER_IDS_FLAG_NAME]: Flags.string({
    description: `Comma-separated list of offer ids. Can't be used together with --${OFFER_FLAG_NAME} flag`,
    helpValue: "<id-1,id-2>",
    exclusive: [OFFER_FLAG_NAME],
  }),
};

export const PRIV_KEY_FLAG_NAME = "priv-key";

export const PRIV_KEY_FLAG = {
  [PRIV_KEY_FLAG_NAME]: Flags.string({
    description: `!WARNING! for debug purposes only. Passing private keys through flags is unsecure. On local network ${LOCAL_NET_DEFAULT_WALLET_KEY} key will be used by default`,
    helpValue: "<private-key>",
  }),
};

export const CHAIN_FLAGS = {
  ...ENV_FLAG,
  ...PRIV_KEY_FLAG,
};

export const DEAL_IDS_FLAG_NAME = "deal-ids";
export const DEPLOYMENT_NAMES_ARG_NAME = "DEPLOYMENT-NAMES";

export const DEAL_IDS_FLAG = {
  [DEAL_IDS_FLAG_NAME]: Flags.string({
    description: `Comma-separated deal ids of the deployed deal. Can't be used together with ${DEPLOYMENT_NAMES_ARG_NAME} arg`,
    helpValue: "<id-1,id-2>",
  }),
};

export const DEPLOYMENT_NAMES_ARG = {
  [DEPLOYMENT_NAMES_ARG_NAME]: Args.string({
    description: `Comma separated names of deployments. Can't be used together with --${DEAL_IDS_FLAG_NAME} flag`,
    helpValue: "<name-1,name-2>",
  }),
};

export const MARINE_BUILD_ARGS_FLAG_NAME = "marine-build-args";
export const MARINE_BUILD_ARGS_PROPERTY = "marineBuildArgs";
export const IPFS_ADDR_PROPERTY = "ipfsAddr";

export const MARINE_BUILD_ARGS_FLAG = {
  [MARINE_BUILD_ARGS_FLAG_NAME]: Flags.string({
    description: `Space separated \`cargo build\` flags and args to pass to marine build. Overrides '${MARINE_BUILD_ARGS_PROPERTY}' property in ${FLUENCE_CONFIG_FULL_FILE_NAME}. Default: ${DEFAULT_MARINE_BUILD_ARGS}`,
    helpValue: "<--flag arg>",
  }),
};

export const TTL_FLAG_NAME = "ttl";
export const DIAL_TIMEOUT_FLAG_NAME = "dial-timeout";

export const FLUENCE_CLIENT_FLAGS = {
  sk: Flags.string({
    char: "k",
    description:
      "Name of the secret key for js-client inside CLI to use. If not specified, will use the default key for the project. If there is no fluence project or there is no default key, will use user's default key",
    helpValue: "<name>",
  }),
  relay: Flags.string({
    description: "Relay for Fluence js-client to connect to",
    helpValue: "<multiaddress>",
  }),
  [TTL_FLAG_NAME]: Flags.integer({
    description:
      "Particle Time To Live since 'now'. After that, particle is expired and not processed.",
    default: 120_000,
    helpValue: "<milliseconds>",
  }),
  [DIAL_TIMEOUT_FLAG_NAME]: Flags.integer({
    description: "Timeout for Fluence js-client to connect to relay peer",
    default: 60000,
    helpValue: "<milliseconds>",
  }),
  "particle-id": Flags.boolean({
    default: false,
    description: "Print particle ids when running Fluence js-client",
  }),
  ...ENV_FLAG,
} as const;

export type FluenceClientFlags = FromFlagsDef<typeof FLUENCE_CLIENT_FLAGS>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FromFlagsDef<T extends OutputFlags<any>> = Omit<
  ParserOutput<T, T>["flags"] extends infer S
    ? {
        [Property in keyof S]: S[Property] extends Flag<infer F> ? F : never;
      }
    : never,
  "json"
>;

export const MODULE_TYPE_RUST = "rust";
export const MODULE_TYPE_COMPILED = "compiled";
export const MODULE_TYPES = [MODULE_TYPE_RUST, MODULE_TYPE_COMPILED] as const;
export type ModuleType = (typeof MODULE_TYPES)[number];

export const TOKENS = ["FakeUSD", "FLT"] as const;
export const TOKENS_STRING = TOKENS.join(", ");
export type Token = (typeof TOKENS)[number];
export const isToken = getIsStringUnion(TOKENS);

export const TEMPLATES = ["quickstart", "minimal", "ts", "js"] as const;
export type Template = (typeof TEMPLATES)[number];
export const isTemplate = getIsStringUnion(TEMPLATES);

export const PACKAGE_NAME = "PACKAGE-NAME";
export const PACKAGE_NAME_AND_VERSION_ARG_NAME = `${PACKAGE_NAME} | PACKAGE-NAME@VERSION`;

export const RECOMMENDED_GITIGNORE_CONTENT = `.idea
.DS_Store
/${DOT_FLUENCE_DIR_NAME}/${SECRETS_DIR_NAME}
/${DOT_FLUENCE_DIR_NAME}/${ENV_CONFIG_FULL_FILE_NAME}
/${DOT_FLUENCE_DIR_NAME}/${SCHEMAS_DIR_NAME}
/${DOT_FLUENCE_DIR_NAME}/${TMP_DIR_NAME}
/${DOT_FLUENCE_DIR_NAME}/${AQUA_DEPENDENCIES_DIR_NAME}/${PACKAGE_JSON_FILE_NAME}
${SRC_DIR_NAME}/${FRONTEND_DIR_NAME}/${SRC_DIR_NAME}/${COMPILED_AQUA_DIR_NAME}/
**/node_modules
**/target/
.repl_history
`;
export const IS_TTY = Boolean(process.stdout.isTTY && process.stdin.isTTY);
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";

export const MARINE_CARGO_DEPENDENCY = "marine";
const MREPL_CARGO_DEPENDENCY = "mrepl";
export const MARINE_RS_SDK_CARGO_DEPENDENCY = "marine-rs-sdk";
export const MARINE_RS_SDK_TEST_CARGO_DEPENDENCY = "marine-rs-sdk-test";

export const AQUA_LIB_NPM_DEPENDENCY = "@fluencelabs/aqua-lib";
export const JS_CLIENT_NPM_DEPENDENCY = "@fluencelabs/js-client";
export const TYPESCRIPT_NPM_DEPENDENCY = "typescript";

export const marineAndMreplDependencies = [
  MARINE_CARGO_DEPENDENCY,
  MREPL_CARGO_DEPENDENCY,
] as const;

export type MarineOrMrepl = (typeof marineAndMreplDependencies)[number];
export const isMarineOrMrepl = getIsStringUnion(marineAndMreplDependencies);

export const SEPARATOR = `\n\n${color.yellow(
  `^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`,
)}\n\n`;

export const RUN_DEPLOYED_SERVICES_FUNCTION_NAME = "runDeployedServices";
export const RUN_DEPLOYED_SERVICES_FUNCTION_CALL = `${RUN_DEPLOYED_SERVICES_FUNCTION_NAME}()`;

const RUN_DEPLOYED_SERVICE_AQUA = `
-- example of running services deployed using \`${CLI_NAME} deploy\`
-- with worker '${DEFAULT_DEPLOYMENT_NAME}' which has service 'MyService' with method 'greeting'

export runDeployedServices, showSubnet

data Answer:
    answer: ?string
    worker: Worker

func ${RUN_DEPLOYED_SERVICES_FUNCTION_NAME}() -> []Answer:
    deals <- Deals.get()
    dealId = deals.${DEFAULT_DEPLOYMENT_NAME}!.dealIdOriginal
    answers: *Answer
    on HOST_PEER_ID:
        subnet <- Subnet.resolve(dealId)
    if subnet.success == false:
        Console.print(["Failed to resolve subnet: ", subnet.error])

    for w <- subnet.workers:
        if w.worker_id == nil:
            answers <<- Answer(answer=nil, worker=w)
        else:
            on w.worker_id! via w.host_id:
                answer <- MyService.greeting("fluence")
                answers <<- Answer(answer=?[answer], worker=w)

    <- answers

data WorkerServices:
    host_id: string
    worker_id: ?string
    services: ?[]string
    spells: ?[]string

func showSubnet() -> []WorkerServices:
    deals <- Deals.get()
    dealId = deals.${DEFAULT_DEPLOYMENT_NAME}!.dealIdOriginal
    on HOST_PEER_ID:
        subnet <- Subnet.resolve(dealId)
    if subnet.success == false:
        Console.print(["Failed to resolve subnet: ", subnet.error])

    services: *WorkerServices
    for w <- subnet.workers:
        if w.worker_id != nil:
            on w.worker_id! via w.host_id:
                -- get list of all services on this worker
                srvs <- Srv.list()

                -- gather spells and services aliases
                spells_aliases: *string
                services_aliases: *string
                for s <- srvs:
                    if s.aliases.length != 0:
                        if s.service_type == "spell":
                            spells_aliases <<- s.aliases[0]
                        if s.service_type == "service":
                            services_aliases <<- s.aliases[0]

                services <<- WorkerServices(host_id=w.host_id, worker_id=w.worker_id, services=?[services_aliases], spells=?[spells_aliases])
        else:
            services <<- WorkerServices(host_id=w.host_id, worker_id=nil, services=nil, spells=nil)

    <- services
`;

const RUN_DEPLOYED_SERVICE_AQUA_COMMENT = aquaComment(
  RUN_DEPLOYED_SERVICE_AQUA,
);

export const getMainAquaFileContent = (
  commentOutRunDeployedServicesAqua: boolean,
) => {
  return `aqua Main

import "${AQUA_LIB_NPM_DEPENDENCY}/builtin.aqua"
import "${AQUA_LIB_NPM_DEPENDENCY}/subnet.aqua"

use "${DEALS_FULL_FILE_NAME}"
use "${HOSTS_FULL_FILE_NAME}"
import "services.aqua"

-- IMPORTANT: Add exports for all functions that you want to run
export helloWorld, helloWorldRemote, getInfo, getInfos

-- DOCUMENTATION:
-- https://fluence.dev


${
  commentOutRunDeployedServicesAqua
    ? RUN_DEPLOYED_SERVICE_AQUA_COMMENT
    : RUN_DEPLOYED_SERVICE_AQUA
}

-- local
func helloWorld(name: string) -> string:
    <- Op.concat_strings("Hello, ", name)

-- remote
func helloWorldRemote(name: string) -> string:
    on HOST_PEER_ID:
        hello_msg <- helloWorld(name)
        from_msg <- Op.concat_strings(hello_msg, "! From ")
        from_peer_msg <- Op.concat_strings(from_msg, HOST_PEER_ID)
    <- from_peer_msg

-- request response
func getInfo() -> Info, PeerId:
    on HOST_PEER_ID:
        info <- Peer.identify()
    <- info, HOST_PEER_ID

-- iterate through several peers
func getInfos(peers: []PeerId) -> []Info:
    infos: *Info
    for p <- peers:
        on p:
            infos <- Peer.identify()
    <- infos
`;
};

export function getSpellAquaFileContent(spellName: string) {
  const moduleName = upperFirst(camelCase(spellName));

  return `aqua ${moduleName}

-- Note: spell main function must be exported
export spell

import Spell from "@fluencelabs/spell/spell_service.aqua"

func spell():
    Spell "${spellName}"
    Spell.store_log("Spell '${spellName}' is working!")
`;
}

// TODO: use relative(pathToFluenceProject, pathToAquaFolder). Won't work rn, need to refactor things.
const TEMPLATE_CONTENT_BASE = `- Default Marine service - \`${join(
  SRC_DIR_NAME,
  SERVICES_DIR_NAME,
)}\`.
- Basic aqua functions - \`${join(SRC_DIR_NAME, AQUA_DIR_NAME)}\`.
- Fluence HTTP Gateway for proxying Aqua execution - \`${join(
  SRC_DIR_NAME,
  GATEWAY_DIR_NAME,
)}\`.`;

const TEMPLATE_CONTENT_FRONTEND = `- Fluence frontend template - \`${join(
  SRC_DIR_NAME,
  FRONTEND_DIR_NAME,
)}\`.`;

const QUICKSTART_README = `# Fluence Quickstart Template

## Content

${TEMPLATE_CONTENT_BASE}

## Usage

\`\`\`sh
# You can deploy right away with an example worker that contains an example service
fluence deploy

# Run the deployed code
fluence run -f 'runDeployedServices()'
\`\`\`
`;

const MINIMAL_README = `# Fluence Minimal Template

## Usage

\`\`\`sh
# Generate a service template and add it to the default worker
fluence service new myService

# Deploy the default worker
fluence deploy

# Uncomment \`runDeployedServices\` aqua function in \`src/aqua/main.aqua\` and run it
fluence run -f 'runDeployedServices()'
\`\`\`
`;

function getTsOrJsReadme(isJS: boolean) {
  const jsOrTsString = isJS ? "JavaScript" : "TypeScript";
  return `# Fluence ${jsOrTsString} Template

## Content

${TEMPLATE_CONTENT_BASE}
${TEMPLATE_CONTENT_FRONTEND}

## Usage

\`\`\`sh
# \`cd\` into \`frontend\` directory
cd src/frontend

# Install dependencies
npm i

# Run example code
npm run dev

# You can also deploy deal and run the deployed code

# Deploy the default worker
fluence deploy

# Compile aqua to ${jsOrTsString} so it contains info about deployed services
fluence aqua

# Try running \`runDeployedServices\` aqua function in the browser
\`\`\`
`;
}

export const SERVICE_INTERFACE_FILE_HEADER = "aqua Services declares *";

export const READMEs: Record<Template, string> = {
  quickstart: QUICKSTART_README,
  minimal: MINIMAL_README,
  ts: getTsOrJsReadme(false),
  js: getTsOrJsReadme(true),
};

export const DEFAULT_OFFER_NAME = "defaultOffer";

export const DEFAULT_CC_REWARD_DELEGATION_RATE = 7;
export const DEFAULT_CC_DURATION = "100 minutes";
export const DURATION_EXAMPLE =
  "in human-readable format. Example: 1 months 1 days";

export const WORKER_SPELL = "worker-spell";
