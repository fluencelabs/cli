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

import { color } from "@oclif/color";
import { Args, Flags } from "@oclif/core";
import type {
  Flag,
  OutputFlags,
  ParserOutput,
} from "@oclif/core/lib/interfaces/parser.js";

import { aquaComment } from "./helpers/utils.js";
import { getIsStringUnion } from "./typeHelpers.js";

export const CLI_NAME = "fluence";
export const CLI_NAME_FULL = "Fluence CLI";
export const GITHUB_REPO_NAME = "https://github.com/fluencelabs/cli";
export const PACKAGE_NAME = "@fluencelabs/cli";
export const NODE_JS_MAJOR_VERSION = 18;
export const DEFAULT_IPFS_ADDRESS = "/dns4/ipfs.fluence.dev/tcp/5001";

export const RUST_WASM32_WASI_TARGET = "wasm32-wasi";

export const DEFAULT_MARINE_BUILD_ARGS = `--release`;

export const U32_MAX = 4_294_967_295;
export const CHECK_FOR_UPDATES_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

export const CONTRACTS_ENV = ["kras", "testnet", "stage", "local"] as const;
export type ContractsENV = (typeof CONTRACTS_ENV)[number];

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

export const FLUENCE_ENVS = [
  "kras",
  "stage",
  "testnet",
  "local",
  "custom",
] as const;
export type FluenceEnv = (typeof FLUENCE_ENVS)[number];
export const isFluenceEnv = getIsStringUnion(FLUENCE_ENVS);

export const DEAL_CONFIG: Record<ContractsENV, ChainConfig> = {
  kras: {
    url: "https://kras-rpc.fluence.dev",
    id: 80001,
  },
  testnet: {
    url: "https://testnet-rpc.fluence.dev",
    id: 80001,
  },
  stage: {
    url: "https://stage-rpc.fluence.dev",
    id: 80001,
  },
  local: {
    url: "http://127.0.0.1:8545",
    id: 31_337,
  },
};

export const DEAL_RPC_CONFIG = Object.fromEntries(
  Object.values(DEAL_CONFIG).map(({ id, url }) => {
    return [id, url];
  }),
);

// @ts-expect-error we know that keys are ContractsEnv, not just string
export const CONTRACTS_ENV_TO_CHAIN_ID: Record<ContractsENV, number> =
  Object.fromEntries(
    Object.entries(DEAL_CONFIG).map(([name, { id }]) => {
      return [name, id];
    }),
  );

export const AQUA_EXT = "aqua";
export const TS_EXT = "ts";
export const JS_EXT = "js";
export const JSON_EXT = "json";
export const YAML_EXT = "yaml";
export const YML_EXT = "yml";
export const WASM_EXT = "wasm";
export const TOML_EXT = "toml";

export const DOT_FLUENCE_DIR_NAME = ".fluence";
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const TS_DIR_NAME = "ts";
export const JS_DIR_NAME = "js";
export const TMP_DIR_NAME = "tmp";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";
export const AQUA_DIR_NAME = "aqua";
export const MODULES_DIR_NAME = "modules";
export const SERVICES_DIR_NAME = "services";
export const SPELLS_DIR_NAME = "spells";
export const NPM_DIR_NAME = "npm";
export const CARGO_DIR_NAME = "cargo";
export const BIN_DIR_NAME = "bin";
export const COUNTLY_DIR_NAME = "countly";

export const FLUENCE_CONFIG_FILE_NAME = `fluence`;
export const WORKERS_CONFIG_FILE_NAME = `workers`;
export const PROJECT_SECRETS_CONFIG_FILE_NAME = `project-secrets`;
export const USER_SECRETS_CONFIG_FILE_NAME = `user-secrets`;
export const GLOBAL_CONFIG_FILE_NAME = `config`;
export const MODULE_CONFIG_FILE_NAME = `module`;
export const SERVICE_CONFIG_FILE_NAME = `service`;
export const SPELL_CONFIG_FILE_NAME = `spell`;
export const ENV_CONFIG_FILE_NAME = `env`;

export const FLUENCE_CONFIG_FULL_FILE_NAME = `${FLUENCE_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const WORKERS_CONFIG_FULL_FILE_NAME = `${WORKERS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const PROJECT_SECRETS_FULL_CONFIG_FILE_NAME = `${PROJECT_SECRETS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const USER_SECRETS_CONFIG_FULL_FILE_NAME = `${USER_SECRETS_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const GLOBAL_CONFIG_FULL_FILE_NAME = `${GLOBAL_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const MODULE_CONFIG_FULL_FILE_NAME = `${MODULE_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const SERVICE_CONFIG_FULL_FILE_NAME = `${SERVICE_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const SPELL_CONFIG_FULL_FILE_NAME = `${SPELL_CONFIG_FILE_NAME}.${YAML_EXT}`;
export const ENV_CONFIG_FULL_FILE_NAME = `${ENV_CONFIG_FILE_NAME}.${YAML_EXT}`;

export const DEFAULT_SRC_AQUA_FILE_NAME = `main.${AQUA_EXT}`;
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
export const SETTINGS_JSON_FILE_NAME = `settings.${JSON_EXT}`;

export const INDEX_TS_FILE_NAME = `index.${TS_EXT}`;
export const INDEX_JS_FILE_NAME = `index.${JS_EXT}`;

export const CONFIG_TOML = `Config.${TOML_EXT}`;
export const CARGO_TOML = `Cargo.${TOML_EXT}`;

export const README_MD_FILE_NAME = `README.md`;

export const FS_OPTIONS = {
  encoding: "utf8",
} as const;

export const TOP_LEVEL_SCHEMA_ID = "https://fluence.dev/schemas";

export const AUTO_GENERATED = "auto-generated";
export const DEFAULT_DEPLOY_NAME = "default";
export const DEFAULT_WORKER_NAME = "defaultWorker";

const KEY_PAIR_FLAG_NAME = "key-pair-name";
export const KEY_PAIR_FLAG = {
  [KEY_PAIR_FLAG_NAME]: Flags.string({
    char: "k",
    description: "Key pair name",
    helpValue: "<name>",
  }),
} as const;

export type KeyPairFlag = FromFlagsDef<typeof KEY_PAIR_FLAG>;

export const NO_INPUT_FLAG_NAME = "no-input";
export const NO_INPUT_FLAG = {
  [NO_INPUT_FLAG_NAME]: Flags.boolean({
    default: false,
    description: "Don't interactively ask for any input from the user",
  }),
} as const;

const envFlagAndArg = {
  description: "Fluence Environment to use when running the command",
  helpValue: `<${FLUENCE_ENVS.join(" | ")}>`,
};

export const ENV_FLAG_NAME = "env";
export const ENV_FLAG = {
  [ENV_FLAG_NAME]: Flags.string(envFlagAndArg),
};

export const ENV_ARG_NAME = "ENV";
export const ENV_ARG = {
  [ENV_ARG_NAME]: Args.string(envFlagAndArg),
};

export const GLOBAL_FLAG_NAME = "global";
export const GLOBAL_FLAG = {
  [GLOBAL_FLAG_NAME]: Flags.boolean({
    default: false,
    aliases: ["g"],
    description: `Will override dependencies in a global user's ${GLOBAL_CONFIG_FULL_FILE_NAME} instead of project's ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
  }),
};

export const PRIV_KEY_FLAG = {
  "priv-key": Flags.string({
    description:
      "!WARNING! for debug purposes only. Passing private keys through flags is unsecure",
    helpValue: "<private-key>",
  }),
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

export const PACKAGE_NAME_AND_VERSION_ARG_NAME =
  "PACKAGE-NAME | PACKAGE-NAME@VERSION";

export const RECOMMENDED_GITIGNORE_CONTENT = `.idea
.DS_Store
/${DOT_FLUENCE_DIR_NAME}/${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}
/${DOT_FLUENCE_DIR_NAME}/${ENV_CONFIG_FULL_FILE_NAME}
/${DOT_FLUENCE_DIR_NAME}/${SCHEMAS_DIR_NAME}
**/node_modules
**/target/
.repl_history
/.vscode/settings.json
/src/ts/src/aqua
/src/js/src/aqua`;

export const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";

export const MARINE_CARGO_DEPENDENCY = "marine";
export const MREPL_CARGO_DEPENDENCY = "mrepl";
export const MARINE_RS_SDK_CARGO_DEPENDENCY = "marine-rs-sdk";
export const MARINE_RS_SDK_TEST_CARGO_DEPENDENCY = "marine-rs-sdk-test";

export const AQUA_LIB_NPM_DEPENDENCY = "@fluencelabs/aqua-lib";
const REGISTRY_NPM_DEPENDENCY = "@fluencelabs/registry";
const SPELL_NPM_DEPENDENCY = "@fluencelabs/spell";
export const JS_CLIENT_NPM_DEPENDENCY = "@fluencelabs/js-client";
export const FLUENCE_NETWORK_ENVIRONMENT_NPM_DEPENDENCY =
  "@fluencelabs/fluence-network-environment";

export const fluenceNPMDependencies = [
  AQUA_LIB_NPM_DEPENDENCY,
  REGISTRY_NPM_DEPENDENCY,
  SPELL_NPM_DEPENDENCY,
] as const;

export const isFluenceNPMDependency = getIsStringUnion(fluenceNPMDependencies);

export const fluenceCargoDependencies = [
  MARINE_CARGO_DEPENDENCY,
  MREPL_CARGO_DEPENDENCY,
] as const;

export const isFluenceCargoDependency = getIsStringUnion(
  fluenceCargoDependencies,
);

export const SEPARATOR = `\n\n${color.yellow(
  `^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`,
)}\n\n`;

const RUN_DEPLOYED_SERVICES_FUNCTION = "runDeployedServices";
export const RUN_DEPLOYED_SERVICES_FUNCTION_CALL = `${RUN_DEPLOYED_SERVICES_FUNCTION}()`;

const RUN_DEPLOYED_SERVICE_AQUA = `
-- example of running services deployed using \`${CLI_NAME} deal deploy\`
-- with worker '${DEFAULT_WORKER_NAME}' which has service 'MyService' with method 'greeting'

export runDeployedServices, showSubnet

data Answer:
    answer: ?string
    worker: Worker

func ${RUN_DEPLOYED_SERVICES_FUNCTION}() -> []Answer:
    deals <- Deals.get()
    dealId = deals.defaultWorker!.dealIdOriginal
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

func showSubnet() -> []WorkerServices:
    deals <- Deals.get()
    dealId = deals.defaultWorker!.dealIdOriginal
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

                -- gather aliases
                aliases: *string
                for s <- srvs:
                    if s.aliases.length != 0:
                        aliases <<- s.aliases[0]

                services <<- WorkerServices(host_id=w.host_id, worker_id=w.worker_id, services=?[aliases])
        else:
            services <<- WorkerServices(host_id=w.host_id, worker_id=nil, services=nil)

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

export const SPELL_AQUA_FILE_CONTENT = `import Op, Debug from "${AQUA_LIB_NPM_DEPENDENCY}/builtin.aqua"
import Spell from "@fluencelabs/spell/spell_service.aqua"

func spell():
    msg = "Spell is working!"
    str <- Debug.stringify(msg)
    Spell "worker-spell"
    Spell.list_push_string("logs", str)
`;

const QUICKSTART_README = `# Fluence Quickstart Template

## Usage

\`\`\`sh
# You can deploy right away with an example worker that contains an example service
fluence deal deploy

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
fluence deal deploy

# Uncomment \`runDeployedServices\` aqua function in \`src/aqua/main.aqua\` and run it
fluence run -f 'runDeployedServices()'
\`\`\`
`;

const TS_README = `# Fluence TypeScript Template

## Usage

\`\`\`sh
# Compile example aqua code to TypeScript
fluence aqua

# \`cd\` into \`ts\` directory
cd src/ts

# Install dependencies
npm i

# Run example code
npm start

# You can also deploy deal and run the deployed code

# Generate a service template and add it to the default worker
fluence service new myService

# Deploy the default worker
fluence deal deploy

# Uncomment \`runDeployedServices\` aqua function in \`src/aqua/main.aqua\` and compile it
fluence aqua

# Import \`runDeployedServices\` function in \`src/ts/src/index.ts\` and run it
npm start
\`\`\`
`;

const JS_README = `# Fluence JavaScript Template

## Usage

\`\`\`sh
# Compile example aqua code to JavaScript
fluence aqua

# \`cd\` into \`js\` directory
cd src/js

# Install dependencies
npm i

# Run example code
npm start

# You can also deploy deal and run the deployed code

# Generate a service template and add it to the default worker
fluence service new myService

# Deploy the default worker
fluence deal deploy

# Uncomment \`runDeployedServices\` aqua function in \`src/aqua/main.aqua\` and compile it
fluence aqua

# Import \`runDeployedServices\` function in \`src/ts/src/index.js\` and run it
npm start
\`\`\`
`;

export const READMEs: Record<Template, string> = {
  quickstart: QUICKSTART_README,
  minimal: MINIMAL_README,
  ts: TS_README,
  js: JS_README,
};
