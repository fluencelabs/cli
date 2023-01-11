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

import type { AvmLoglevel } from "@fluencelabs/fluence";
import { Command, Flags } from "@oclif/core";

import { aquaComment, jsComment } from "./helpers/comment";
import { jsonStringify } from "./helpers/jsonStringify";
import { js, jsFile } from "./helpers/jsTemplateLitteral";
import { local } from "./localNodes";
import { FLUENCE_ENV } from "./setupEnvironment";

export const AQUA_RECOMMENDED_VERSION = "0.8.0-368";
export const MARINE_RECOMMENDED_VERSION = "0.12.5";
export const MREPL_RECOMMENDED_VERSION = "0.18.8";
export const MARINE_RS_SDK_TEMPLATE_VERSION = "0.7.1";
export const MARINE_RS_SDK_TEST_TEMPLATE_VERSION = "0.8.1";
export const FLUENCE_JS_RECOMMENDED_VERSION = "0.27.4";
export const FLUENCE_NETWORK_ENVIRONMENT_RECOMMENDED_VERSION = "1.0.13";
export const TS_NODE_RECOMMENDED_VERSION = "10.9.1";
export const TYPESCRIPT_RECOMMENDED_VERSION = "4.8.4";
export const REQUIRED_RUST_TOOLCHAIN = "nightly-x86_64";
export const RUST_WASM32_WASI_TARGET = "wasm32-wasi";

export const AQUA_EXT = "aqua";
export const TS_EXT = "ts";
export const JS_EXT = "js";
export const JSON_EXT = "json";
export const YAML_EXT = "yaml";
export const WASM_EXT = "wasm";
export const TOML_EXT = "toml";

export const FLUENCE_DIR_NAME = ".fluence";
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const TS_DIR_NAME = "ts";
export const JS_DIR_NAME = "js";
export const TMP_DIR_NAME = "tmp";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";
export const AQUA_DIR_NAME = "aqua";
export const AQUA_SERVICES_DIR_NAME = "services";
export const MODULES_DIR_NAME = "modules";
export const SERVICES_DIR_NAME = "services";
export const NPM_DIR_NAME = "npm";
export const CARGO_DIR_NAME = "cargo";
export const BIN_DIR_NAME = "bin";
export const DOT_BIN_DIR_NAME = ".bin";
export const COUNTLY_DIR_NAME = "countly";

export const FLUENCE_CONFIG_FILE_NAME = `fluence.${YAML_EXT}`;
export const FLUENCE_LOCK_CONFIG_FILE_NAME = `fluence-lock.${YAML_EXT}`;
export const PROJECT_SECRETS_CONFIG_FILE_NAME = `project-secrets.${YAML_EXT}`;
export const USER_SECRETS_CONFIG_FILE_NAME = `user-secrets.${YAML_EXT}`;
export const CONFIG_FILE_NAME = `config.${YAML_EXT}`;
export const MODULE_CONFIG_FILE_NAME = `module.${YAML_EXT}`;
export const SERVICE_CONFIG_FILE_NAME = `service.${YAML_EXT}`;
export const APP_CONFIG_FILE_NAME = `app.${YAML_EXT}`;
export const DEPENDENCY_CONFIG_FILE_NAME = `dependency.${YAML_EXT}`;

const DEPLOYED_APP_FILE_NAME = "deployed.app";

export const DEPLOYED_APP_AQUA_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${AQUA_EXT}`;
export const DEFAULT_SRC_AQUA_FILE_NAME = `main.${AQUA_EXT}`;
export const INTERFACES_AQUA_FILE_NAME = `interfaces.${AQUA_EXT}`;

export const GITIGNORE_FILE_NAME = ".gitignore";

export const PACKAGE_JSON_FILE_NAME = `package.${JSON_EXT}`;
export const TS_CONFIG_FILE_NAME = `tsconfig.${JSON_EXT}`;
export const EXTENSIONS_JSON_FILE_NAME = `extensions.${JSON_EXT}`;
export const SETTINGS_JSON_FILE_NAME = `settings.${JSON_EXT}`;
export const DEPLOY_CONFIG_FILE_NAME = `deploy.${JSON_EXT}`;
export const APP_SERVICE_JSON_FILE_NAME = `app-service.${JSON_EXT}`;

export const APP_TS_FILE_NAME = `app.${TS_EXT}`;
export const APP_JS_FILE_NAME = `app.${JS_EXT}`;
export const DEPLOYED_APP_TS_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${TS_EXT}`;
export const DEPLOYED_APP_JS_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${JS_EXT}`;
export const INDEX_TS_FILE_NAME = `index.${TS_EXT}`;
export const INDEX_JS_FILE_NAME = `index.${JS_EXT}`;

export const CRATES_TOML = `.crates.${TOML_EXT}`;
export const CONFIG_TOML = `Config.${TOML_EXT}`;

export const FS_OPTIONS = {
  encoding: "utf8",
} as const;

export const TOP_LEVEL_SCHEMA_ID = "https://fluence.dev/schemas";

export const AUTO_GENERATED = "auto-generated";
export const DEFAULT_DEPLOY_NAME = "default";

export const KEY_PAIR_FLAG_NAME = "key-pair-name";
export const KEY_PAIR_FLAG = {
  [KEY_PAIR_FLAG_NAME]: Flags.string({
    char: "k",
    description: "Key pair name",
    helpValue: "<name>",
  }),
} as const;

export const NO_INPUT_FLAG_NAME = "no-input";
export const NO_INPUT_FLAG = {
  [NO_INPUT_FLAG_NAME]: Flags.boolean({
    description: "Don't interactively ask for any input from the user",
  }),
} as const;

export const TIMEOUT_FLAG_NAME = "timeout";
export const TIMEOUT_FLAG = {
  [TIMEOUT_FLAG_NAME]: Flags.integer({
    description: "Timeout used for command execution",
    helpValue: "<milliseconds>",
  }),
} as const;

export const templates = ["minimal", "ts", "js"] as const;
export type Template = typeof templates[number];
export const isTemplate = (unknown: unknown): unknown is Template =>
  templates.some((val): boolean => unknown === val);

export const AQUA_LOG_LEVELS = [
  "all",
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "off",
] as const;

export type AquaLogLevel = typeof AQUA_LOG_LEVELS[number];

export const isAquaLogLevel = (unknown: unknown): unknown is AquaLogLevel =>
  AQUA_LOG_LEVELS.some((val): boolean => unknown === val);

export const aquaLogLevelsString = `Must be one of: ${AQUA_LOG_LEVELS.join(
  ", "
)}`;

/**
 * Subject to change after change after DXJ-71
 */
export const AVM_LOG_LEVELS: Array<AvmLoglevel> = [
  "debug",
  "info",
  "warn",
  "error",
  "off",
  "trace",
];

export const avmLogLevelsString = AVM_LOG_LEVELS.join(", ");

export const isAvmLogLevel = (unknown: unknown): unknown is AvmLoglevel =>
  AVM_LOG_LEVELS.some((level) => level === unknown);

export const FORCE_FLAG_NAME = "force";
export const NAME_FLAG_NAME = "name";

export const PACKAGE_NAME_AND_VERSION_ARG_NAME =
  "PACKAGE-NAME | PACKAGE-NAME@VERSION";

export type CommandObj = Readonly<InstanceType<typeof Command>>;

export const RECOMMENDED_GITIGNORE_CONTENT = `.idea
.DS_Store
.fluence
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
export const AQUA_NPM_DEPENDENCY = "@fluencelabs/aqua";
export const AQUA_LIB_NPM_DEPENDENCY = "@fluencelabs/aqua-lib";

const MAIN_AQUA_FILE_UNCOMMENT_TEXT = `-- Uncomment the following when you deploy your app with Adder service:
`;

export const MAIN_AQUA_FILE_APP_IMPORT_TEXT = `${MAIN_AQUA_FILE_UNCOMMENT_TEXT}
import App from "deployed.app.aqua"
import Adder from "services/adder.aqua"
export App, addOne`;

export const MAIN_AQUA_FILE_APP_IMPORT_TEXT_COMMENT = aquaComment(
  MAIN_AQUA_FILE_APP_IMPORT_TEXT
);

export const MAIN_AQUA_FILE_ADD_ONE = `${MAIN_AQUA_FILE_UNCOMMENT_TEXT}
func addOne(x: u64) -> u64:
    services <- App.services()
    on services.adder.default!.peerId:
        Adder services.adder.default!.serviceId
        res <- Adder.add_one(x)
    <- res`;

export const MAIN_AQUA_FILE_ADD_ONE_COMMENT = aquaComment(
  MAIN_AQUA_FILE_ADD_ONE
);

export const MAIN_AQUA_FILE_CONTENT = `aqua Main

import "@fluencelabs/aqua-lib/builtin.aqua"

${MAIN_AQUA_FILE_APP_IMPORT_TEXT_COMMENT}



-- IMPORTANT: Add exports for all functions that you want to run
export helloWorld, helloWorldRemote, getInfo, getInfos, getInfosInParallel

-- DOCUMENTATION:
-- https://fluence.dev


${MAIN_AQUA_FILE_ADD_ONE_COMMENT}



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

const TEMPLATE_INDEX_FILE_UNCOMMENT_TEST = "// Uncomment when app is deployed:";

export const getTemplateIndexAppImports = (
  isJS: boolean
): string => js`${TEMPLATE_INDEX_FILE_UNCOMMENT_TEST}
import { addOne } from "./aqua/main${isJS}";
import { registerApp } from "./aqua/app${isJS}";`;

export const getTemplateIndexAppImportsComment = (isJS: boolean): string =>
  jsComment(getTemplateIndexAppImports(isJS));

export const TEMPLATE_INDEX_APP_REGISTER = `  ${TEMPLATE_INDEX_FILE_UNCOMMENT_TEST}
  registerApp()
  console.log(await addOne(1))`;

export const TEMPLATE_INDEX_APP_REGISTER_COMMENT = jsComment(
  TEMPLATE_INDEX_APP_REGISTER
);

const NODES_CONST = "nodes";

const getPeersImportStatement = (peersToImport: string): string =>
  `import { ${peersToImport} as ${NODES_CONST} } from "@fluencelabs/fluence-network-environment";`;

const PEERS = (() => {
  const fluenceEnv = process.env[FLUENCE_ENV];

  switch (fluenceEnv) {
    case "kras":
      return getPeersImportStatement("krasnodar");
    case "stage":
      return getPeersImportStatement("stage");
    case "testnet":
      return getPeersImportStatement("testNet");
    case "local":
      return `const ${NODES_CONST} = ${jsonStringify(local)}`;

    default: {
      const _exhaustiveCheck: never = fluenceEnv;
      throw new Error(
        `Unknown value of environment variable FLUENCE_ENV="${String(
          _exhaustiveCheck
        )}"`
      );
    }
  }
})();

export const getTemplateIndexFileContent = (isJS: boolean): string => jsFile`
import { Fluence } from "@fluencelabs/fluence";
${PEERS}

import {
  helloWorld,
  helloWorldRemote,
  getInfo,
  getInfos,
  getInfosInParallel,
} from "./aqua/main${isJS}";

${getTemplateIndexAppImportsComment(isJS)}

const peerIds = ${NODES_CONST}.map(({ peerId }) => peerId);
const connectTo = ${NODES_CONST}[0].multiaddr;
if (typeof connectTo !== "string") {
  throw new Error("connectTo is not a string");
}

const main = async () => {
  await Fluence.start({ connectTo });

  const helloWorldResult = await helloWorld("Fluence");
  const helloWorldRemoteResult = await helloWorldRemote("Fluence");
  const getInfoResult = await getInfo();
  const getInfosResult = await getInfos(peerIds);
  const getInfosInParallelResult = await getInfosInParallel(peerIds);

  console.log(helloWorldResult);

${TEMPLATE_INDEX_APP_REGISTER_COMMENT}
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
});
`;
