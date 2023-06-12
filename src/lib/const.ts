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

import oclifColor from "@oclif/color";
const color = oclifColor.default;
import { Flags } from "@oclif/core";
import type {
  Flag,
  OutputFlags,
  ParserOutput,
} from "@oclif/core/lib/interfaces/parser.js";

import { aquaComment } from "./helpers/comment.js";
import { jsonStringify } from "./helpers/jsonStringify.js";
import { local } from "./localNodes.js";
import type { FluenceEnv } from "./multiaddres.js";
import { FLUENCE_ENV } from "./setupEnvironment.js";
import { getIsStringUnion } from "./typeHelpers.js";

export const TS_NODE_RECOMMENDED_VERSION = "10.9.1";
export const TYPESCRIPT_RECOMMENDED_VERSION = "4.8.4";
export const RUST_WASM32_WASI_TARGET = "wasm32-wasi";

export const U32_MAX = 4_294_967_295;
export const CHECK_FOR_UPDATES_INTERVAL = 1000 * 60 * 60 * 24; // 1 day

export const CHAIN_NETWORKS = [
  "local",
  "testnet",
  //  "mainnet"
] as const;

export const isChainNetwork = getIsStringUnion(CHAIN_NETWORKS);
export type ChainNetwork = (typeof CHAIN_NETWORKS)[number];

export type ChainConfig = {
  ethereumNodeUrl: string;
  coreAddress: string;
  dealFactoryAddress: string;
  developerFaucetAddress: string;
  chainId: number;
};

export const CLI_CONNECTOR_URL = "https://cli-connector.fluence.dev";
export const WC_PROJECT_ID = "70c1c5ed2a23e7383313de1044ddce7e";
export const WC_METADATA = {
  name: "Fluence CLI",
  description:
    "Fluence CLI is designed to be the only tool that you need to manage the life cycle of applications written on Fluence.",
  url: "https://github.com/fluencelabs/fluence-cli",
  icons: [],
};
export const DEAL_CONFIG: Record<ChainNetwork, ChainConfig> = {
  local: {
    ethereumNodeUrl: "http://127.0.0.1:8545",
    coreAddress: "0x42e59295F72a5B31884d8532396C0D89732c8e84",
    dealFactoryAddress: "0xea6777e8c011E7968605fd012A9Dd49401ec386C",
    developerFaucetAddress: "0x3D56d40F298AaC494EE4612d39edF591ed8C5c69",
    chainId: 31_337,
  },
  testnet: {
    ethereumNodeUrl: "https://testnet.aurora.dev",
    coreAddress: "0x11134d4e7a8Fcb28A7eB4f08bf2FE03b0A96E097",
    dealFactoryAddress: "0xb497e025D3095A197E30Ca84DEc36a637E649868",
    developerFaucetAddress: "0xbCec12E243Be086bae044AB7857B4AE5a20dB16C",
    chainId: 1313161555,
  },
};
export const DEAL_RPC_CONFIG = {
  31_337: DEAL_CONFIG["local"].ethereumNodeUrl,
  1313161555: DEAL_CONFIG["testnet"].ethereumNodeUrl,
};

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
export const DOT_BIN_DIR_NAME = ".bin";
export const COUNTLY_DIR_NAME = "countly";

export const FLUENCE_CONFIG_FILE_NAME = `fluence.${YAML_EXT}`;
export const WORKERS_CONFIG_FILE_NAME = `workers.${YAML_EXT}`;
export const PROJECT_SECRETS_CONFIG_FILE_NAME = `project-secrets.${YAML_EXT}`;
export const USER_SECRETS_CONFIG_FILE_NAME = `user-secrets.${YAML_EXT}`;
export const CONFIG_FILE_NAME = `config.${YAML_EXT}`;
export const MODULE_CONFIG_FILE_NAME = `module.${YAML_EXT}`;
export const SERVICE_CONFIG_FILE_NAME = `service.${YAML_EXT}`;
export const SPELL_CONFIG_FILE_NAME = `spell.${YAML_EXT}`;

export const DEFAULT_SRC_AQUA_FILE_NAME = `main.${AQUA_EXT}`;
export const AQUA_SERVICES_FILE_NAME = `services.${AQUA_EXT}`;
export const AQUA_WORKERS_FILE_NAME = `workers.${AQUA_EXT}`;
export const SPELL_AQUA_FILE_NAME = `spell.${AQUA_EXT}`;

export const GITIGNORE_FILE_NAME = ".gitignore";

export const PACKAGE_JSON_FILE_NAME = `package.${JSON_EXT}`;
export const TS_CONFIG_FILE_NAME = `tsconfig.${JSON_EXT}`;
export const EXTENSIONS_JSON_FILE_NAME = `extensions.${JSON_EXT}`;
export const SETTINGS_JSON_FILE_NAME = `settings.${JSON_EXT}`;
export const DEPLOY_CONFIG_FILE_NAME = `deploy.${JSON_EXT}`;

export const INDEX_TS_FILE_NAME = `index.${TS_EXT}`;
export const INDEX_JS_FILE_NAME = `index.${JS_EXT}`;

export const CONFIG_TOML = `Config.${TOML_EXT}`;
export const CARGO_TOML = `Cargo.${TOML_EXT}`;

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
    description: "Don't interactively ask for any input from the user",
  }),
} as const;

export const NETWORK_FLAG_NAME = "network";
export const NETWORK_FLAG = {
  [NETWORK_FLAG_NAME]: Flags.string({
    description: `The network in which the transactions used by the command will be carried out (${CHAIN_NETWORKS.join(
      ", "
    )})`,
    helpValue: "<network>",
    default: "testnet",
  }),
};

export const GLOBAL_FLAG_NAME = "global";
export const GLOBAL_FLAG = {
  [GLOBAL_FLAG_NAME]: Flags.boolean({
    aliases: ["g"],
    description: `Will override dependencies in a global user's ${CONFIG_FILE_NAME} instead of project's ${FLUENCE_CONFIG_FILE_NAME}`,
  }),
};

export const PRIV_KEY_FLAG = {
  privKey: Flags.string({
    description:
      "!WARNING! for debug purposes only. Passing private keys through flags is unsecure",
  }),
};

export const OFF_AQUA_LOGS_FLAG = {
  "off-aqua-logs": Flags.boolean({
    description:
      "Turns off logs from Console.print in aqua and from IPFS service",
  }),
};

export const USE_F64_FLAG = {
  f64: Flags.boolean({
    description:
      "Convert all numbers to f64. Useful for arrays objects that contain numbers of different types in them. Without this flag, numbers will be converted to u64, i64 or f64 depending on their value",
  }),
};

export const NO_BUILD_FLAG = {
  "no-build": Flags.boolean({
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
    default: 60000,
    helpValue: "<milliseconds>",
  }),
  [DIAL_TIMEOUT_FLAG_NAME]: Flags.integer({
    description: "Timeout for Fluence js-client to connect to relay peer",
    default: 60000,
    helpValue: "<milliseconds>",
  }),
  "particle-id": Flags.boolean({
    description: "Print particle ids when running Fluence js-client",
  }),
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

export const TEMPLATES = ["minimal", "ts", "js"] as const;
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
  ", "
)}`;

export const PACKAGE_NAME_AND_VERSION_ARG_NAME =
  "PACKAGE-NAME | PACKAGE-NAME@VERSION";

export const RECOMMENDED_GITIGNORE_CONTENT = `.idea
.DS_Store
${DOT_FLUENCE_DIR_NAME}
**/node_modules
**/target/
.repl_history
.vscode/settings.json
src/ts/src/aqua
src/js/src/aqua`;

export const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";

export const MARINE_CARGO_DEPENDENCY = "marine";
export const MREPL_CARGO_DEPENDENCY = "mrepl";
export const MARINE_RS_SDK_CARGO_DEPENDENCY = "marine-rs-sdk";
export const MARINE_RS_SDK_TEST_CARGO_DEPENDENCY = "marine-rs-sdk-test";

const AQUA_LIB_NPM_DEPENDENCY = "@fluencelabs/aqua-lib";
const REGISTRY_NPM_DEPENDENCY = "@fluencelabs/registry";
const SPELL_NPM_DEPENDENCY = "@fluencelabs/spell";
export const JS_CLIENT_NODE_NPM_DEPENDENCY = "@fluencelabs/js-client.node";
export const JS_CLIENT_API_NPM_DEPENDENCY = "@fluencelabs/js-client.api";
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
  fluenceCargoDependencies
);

export const SEPARATOR = `\n\n${color.yellow(
  `^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^`
)}\n\n`;

const MAIN_AQUA_FILE_STATUS_TEXT = `export status

-- example of running a service deployed using 'fluence deal deploy'
-- with worker '${DEFAULT_WORKER_NAME}' which has service 'MyService' with method 'greeting'

func status():
    workersInfo <- getWorkersInfo()
    dealId = workersInfo.deals.${DEFAULT_WORKER_NAME}.dealId
    print = (answer: string, peer: string):
      Console.print([answer, peer])

    answers: *string
    workers <- resolveSubnetwork(dealId)
    for w <- workers! par:
        on w.metadata.peer_id via w.metadata.relay_id:
            answer <- MyService.greeting("fluence")
            answers <<- answer
            print(answer, w.metadata.peer_id)

    Console.print("getting answers...")
    join answers[workers!.length - 1]
    par Peer.timeout(PARTICLE_TTL / 2, "TIMED OUT")
    Console.print("done")`;

const MAIN_AQUA_FILE_STATUS_TEXT_COMMENT = aquaComment(
  MAIN_AQUA_FILE_STATUS_TEXT
);

export const MAIN_AQUA_FILE_CONTENT = `aqua Main

import "${AQUA_LIB_NPM_DEPENDENCY}/builtin.aqua"
import "${REGISTRY_NPM_DEPENDENCY}/subnetwork.aqua"
import Registry from "${REGISTRY_NPM_DEPENDENCY}/registry-service.aqua"
import "${SPELL_NPM_DEPENDENCY}/spell_service.aqua"

import "${AQUA_WORKERS_FILE_NAME}"
import "services.aqua"

-- IMPORTANT: Add exports for all functions that you want to run
export helloWorld, helloWorldRemote, getInfo, getInfos, getInfosInParallel

-- DOCUMENTATION:
-- https://fluence.dev


${MAIN_AQUA_FILE_STATUS_TEXT_COMMENT}

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

-- parallel computation
func getInfosInParallel(peers: []PeerId) -> []Info:
    infos: *Info
    for p <- peers par:
        on p:
            infos <- Peer.identify()

    join infos[Op.array_length(peers) - 1] -- "-1" because it's 0-based
    par Peer.timeout(PARTICLE_TTL / 2, "")

    <- infos
`;

export const DISABLE_TS_AND_ES_LINT = `/* eslint-disable */
// @ts-nocheck`;

const NODES_CONST = "nodes";

const getPeersImportStatement = (peersToImport: string): string => {
  return `import { ${peersToImport} as ${NODES_CONST} } from "@fluencelabs/fluence-network-environment";`;
};

const PEERS = {
  kras: getPeersImportStatement("krasnodar"),
  stage: getPeersImportStatement("stage"),
  testnet: getPeersImportStatement("testNet"),
  local: `const ${NODES_CONST} = ${jsonStringify(local)}`,
  // This typescript error happens only when running config docs generation script that's why type assertion is used
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unnecessary-type-assertion
}[process.env[FLUENCE_ENV] as FluenceEnv];

export const TEMPLATE_INDEX_FILE_CONTENT = `${DISABLE_TS_AND_ES_LINT}
import "@fluencelabs/js-client.node";
import { Fluence } from "@fluencelabs/js-client.api";
${PEERS}

import {
  helloWorld,
  helloWorldRemote,
  getInfo,
  getInfos,
  getInfosInParallel,
} from "./aqua/main.js";

const peerIds = ${NODES_CONST}.map(({ peerId }) => peerId);
const connectTo = ${NODES_CONST}[0].multiaddr;
if (typeof connectTo !== "string") {
  throw new Error("connectTo is not a string");
}

const main = async () => {
  await Fluence.connect(connectTo);

  const helloWorldResult = await helloWorld("Fluence");
  const helloWorldRemoteResult = await helloWorldRemote("Fluence");
  const getInfoResult = await getInfo();
  const getInfosInParallelResult = await getInfosInParallel(peerIds);

  console.log(helloWorldResult);

  process.exit(0);
};

main().catch((error) => {
  console.error(error);
});`;

export const SPELL_AQUA_FILE_CONTENT = `import Op, Debug from "@fluencelabs/aqua-lib/builtin.aqua"
import Spell from "@fluencelabs/spell/spell_service.aqua"

func spell():
    msg = "Spell is working!"
    str <- Debug.stringify(msg)
    Spell "worker-spell"
    Spell.list_push_string("logs", str)
`;
