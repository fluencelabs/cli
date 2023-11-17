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

export const numberProperties = [
  "minPricePerWorkerEpoch",
  "maxCollateralPerWorker",
] as const;

export type NumberProperty = (typeof numberProperties)[number];

const ETH = 10 ** 18;
const MILLI_ETH = 10 ** 15;

export const defaultNumberProperties: Record<NumberProperty, number> = {
  maxCollateralPerWorker: ETH,
  minPricePerWorkerEpoch: 83 * MILLI_ETH,
};

export const U32_MAX = 4_294_967_295;
export const CHECK_FOR_UPDATES_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

export const PUBLIC_FLUENCE_ENV = ["kras", "testnet", "stage"] as const;
export type PublicFluenceEnv = (typeof PUBLIC_FLUENCE_ENV)[number];
export const isPublicFluenceEnv = getIsStringUnion(PUBLIC_FLUENCE_ENV);

export const CONTRACTS_ENV = [...PUBLIC_FLUENCE_ENV, "local"] as const;
export type ContractsENV = (typeof CONTRACTS_ENV)[number];
export const isContractsEnv = getIsStringUnion(CONTRACTS_ENV);

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

export const FLUENCE_ENVS = [...CONTRACTS_ENV, "custom"] as const;
export type FluenceEnv = (typeof FLUENCE_ENVS)[number];
export const isFluenceEnv = getIsStringUnion(FLUENCE_ENVS);

export const DEAL_CONFIG: Record<ContractsENV, ChainConfig> = {
  kras: {
    url: "https://polygon-mumbai.g.alchemy.com/v2/lSTLbdQejAUJ854kpjvyFXrmKocI2N-z",
    id: 80001,
  },
  testnet: {
    url: "https://polygon-mumbai.g.alchemy.com/v2/_Tc--Ia76JVzBPdr8IbBWDTCPf-DVQpS",
    id: 80001,
  },
  stage: {
    url: "https://polygon-mumbai.g.alchemy.com/v2/_nxv_qsNy3ZWBipXy41imOXj4j6aNfCc",
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

export const IPFS_CONTAINER_NAME = "ipfs";
export const IPFS_PORT = 5001;
export const LOCAL_IPFS_ADDRESS = `/ip4/127.0.0.1/tcp/${IPFS_PORT}`;
export const CHAIN_CONTAINER_NAME = "chain";
export const CHAIN_PORT = 8545;
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
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const FRONTEND_DIR_NAME = "frontend";
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
export const SETTINGS_JSON_FILE_NAME = `settings.${JSON_EXT}`;

export const INDEX_TS_FILE_NAME = `index.${TS_EXT}`;
export const INDEX_JS_FILE_NAME = `index.${JS_EXT}`;
export const INDEX_HTML_FILE_NAME = `index.html`;

export const CONFIG_TOML = `Config.${TOML_EXT}`;
export const CARGO_TOML = `Cargo.${TOML_EXT}`;

export const README_MD_FILE_NAME = `README.md`;

export const FS_OPTIONS = {
  encoding: "utf8",
} as const;

export const TOP_LEVEL_SCHEMA_ID = "https://fluence.dev/schemas";

export const AUTO_GENERATED = "auto-generated";
export const DEFAULT_DEPLOY_NAME = "default";
export const DEFAULT_DEAL_NAME = "dealName";
export const DEFAULT_WORKER_NAME = "workerName";

const SK_FLAG_NAME = "sk";
export const KEY_PAIR_FLAG = {
  [SK_FLAG_NAME]: Flags.string({
    char: "k",
    description: "Name of a peer's Network Private Key",
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

export const NOXES_FLAG = {
  noxes: Flags.integer({
    description: "Number of Compute Peers to generate in your provider config",
  }),
};

export const PROVIDER_CONFIG_FLAGS = {
  name: Flags.string({
    description: "Provider config name",
    aliases: ["n"],
  }),
  [ENV_FLAG_NAME]: Flags.string({
    description: "Environment to use when generating the provider config",
    helpValue: `<${CONTRACTS_ENV.join(" | ")}>`,
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
/${DOT_FLUENCE_DIR_NAME}/${SECRETS_DIR_NAME}
/${DOT_FLUENCE_DIR_NAME}/${ENV_CONFIG_FULL_FILE_NAME}
/${DOT_FLUENCE_DIR_NAME}/${SCHEMAS_DIR_NAME}
/${DOT_FLUENCE_DIR_NAME}/${TMP_DIR_NAME}
**/node_modules
**/target/
.repl_history
/.vscode/settings.json
/src/ts/src/aqua
/src/js/src/aqua`;
export const IS_TTY = Boolean(process.stdout.isTTY && process.stdin.isTTY);
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";

export const MARINE_CARGO_DEPENDENCY = "marine";
export const MREPL_CARGO_DEPENDENCY = "mrepl";
export const MARINE_RS_SDK_CARGO_DEPENDENCY = "marine-rs-sdk";
export const MARINE_RS_SDK_TEST_CARGO_DEPENDENCY = "marine-rs-sdk-test";

export const AQUA_LIB_NPM_DEPENDENCY = "@fluencelabs/aqua-lib";
const REGISTRY_NPM_DEPENDENCY = "@fluencelabs/registry";
const SPELL_NPM_DEPENDENCY = "@fluencelabs/spell";
export const JS_CLIENT_NPM_DEPENDENCY = "@fluencelabs/js-client";

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
-- with worker '${DEFAULT_DEAL_NAME}' which has service 'MyService' with method 'greeting'

export runDeployedServices, showSubnet

data Answer:
    answer: ?string
    worker: Worker

func ${RUN_DEPLOYED_SERVICES_FUNCTION}() -> []Answer:
    deals <- Deals.get()
    dealId = deals.${DEFAULT_DEAL_NAME}!.dealIdOriginal
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
    dealId = deals.${DEFAULT_DEAL_NAME}!.dealIdOriginal
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

export const SPELL_AQUA_FILE_CONTENT = `import Op, Debug from "${AQUA_LIB_NPM_DEPENDENCY}/builtin.aqua"
import Spell from "@fluencelabs/spell/spell_service.aqua"

func spell():
    msg = "Spell is working!"
    str <- Debug.stringify(msg)
    Spell "worker-spell"
    Spell.store_log(str)
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

function getTsOrJsReadme(isJS: boolean) {
  const jsOrTsString = isJS ? "JavaScript" : "TypeScript";
  return `# Fluence ${jsOrTsString} Template
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
fluence deal deploy

# Compile aqua to ${jsOrTsString} so it contains info about deployed services
fluence aqua

# Try running \`runDeployedServices\` aqua function in the browser
\`\`\`
`;
}

export const READMEs: Record<Template, string> = {
  quickstart: QUICKSTART_README,
  minimal: MINIMAL_README,
  ts: getTsOrJsReadme(false),
  js: getTsOrJsReadme(true),
};

export const WALLET_KEYS_FOR_LOCAL_NETWORK = [
  "0x3cc23e0227bd17ea5d6ea9d42b5eaa53ad41b1974de4755c79fe236d361a6fd5",
  "0x089162470bcfc93192b95bff0a1860d063266875c782af9d882fcca125323b41",
  "0xdacd4b197ee7e9efdd5db1921c6c558d88e2c8b69902b8bafc812fb226a6b5e0",
  "0xa22813cba71d9795475e88d8d84fd3ef6e9ed4e3d5f3c34462ae1645cd1f7f16",
  "0xf96cde07b5743540fbad99faaabc7ac3158d5665f1eed0ec7ad913622b121903",
  "0xfeb277a2fb0e226a729174c44bcc7dcb94dcfef7d4c1eb77e60e83a176f812cd",
  "0xfdc4ba94809c7930fe4676b7d845cbf8fa5c1beae8744d959530e5073004cf3f",
  "0xc9b5b488586bf92ed1fe35a985b48b92392087e86da2011896c289e0010fc6bf",
  "0xe6776a7310afaffed6aeca2b54b1547d72dbfc9268ed05850584ddce53cf87a1",
  "0xb454e1649f031838a3b63b2fb693635266e048754f23cae6d9718250e3fb8905",
  "0xb8849e63d7c25960af6eaff78fd82fe916b2c20cf569aaf4fa259c15faedd146",
  "0x53513db9b03255c58b5f535e6d9e15bb3bfed583839094126b9a42ce2aa7469c",
  "0x66486a3148467413a10cc8891b657bf092d307e066a08b833b892913607aede0",
  "0x5918ecc0f743222dee4ae4f2be17965e785435af6223ad3bdff80354d893f0c2",
  "0xb76b8ce771bfccf0167c3b2a51993e7687a4d8cbfb9ced61a98f601a772bda08",
  "0xcb448613322f0ae09bb111e6bfd5be93480f1ec521b062a614f9af025c8f1852",
  "0x147840cb64e7c4ae02917144897c37b521b859ac643bf55ec83444c11c3a8a30",
  "0x1a1bf9026a097f33ce1a51f5aa0c4102e4a1432c757d922200ef37df168ae504",
  "0xbb3457514f768615c8bc4061c7e47f817c8a570c5c3537479639d4fad052a98a",
  "0xfbd9e512cc1b62db1ca689737c110afa9a3799e1bc04bf12c1c34ac39e0e2dd5",
];
