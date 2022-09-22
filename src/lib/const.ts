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

import { Command, Flags } from "@oclif/core";

export const AQUA_RECOMMENDED_VERSION = "0.7.5-342";
export const MARINE_RECOMMENDED_VERSION = "0.12.4";
export const MREPL_RECOMMENDED_VERSION = "0.18.6";
export const MARINE_RS_SDK_TEMPLATE_VERSION = "0.6.15";
export const MARINE_RS_SDK_TEST_TEMPLATE_VERSION = "0.5.0";
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
export const TMP_DIR_NAME = "tmp";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";
export const AQUA_DIR_NAME = "aqua";
export const AQUA_SERVICES_DIR_NAME = "services";
export const TS_DIR_NAME = "ts";
export const JS_DIR_NAME = "js";
export const MODULES_DIR_NAME = "modules";
export const SERVICES_DIR_NAME = "services";
export const NPM_DIR_NAME = "npm";
export const CARGO_DIR_NAME = "cargo";
export const BIN_DIR_NAME = "bin";
export const DOT_BIN_DIR_NAME = ".bin";

export const FLUENCE_CONFIG_FILE_NAME = `fluence.${YAML_EXT}`;
export const SECRETS_CONFIG_FILE_NAME = `secrets.${YAML_EXT}`;
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
export const EXTENSIONS_JSON_FILE_NAME = `extensions.${JSON_EXT}`;
export const SETTINGS_JSON_FILE_NAME = `settings.${JSON_EXT}`;
export const DEPLOY_CONFIG_FILE_NAME = `deploy.${JSON_EXT}`;
export const APP_SERVICE_JSON_FILE_NAME = `app-service.${JSON_EXT}`;

export const APP_TS_FILE_NAME = `app.${TS_EXT}`;
export const APP_JS_FILE_NAME = `app.${JS_EXT}`;
export const DEPLOYED_APP_TS_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${TS_EXT}`;
export const DEPLOYED_APP_JS_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${JS_EXT}`;

export const CRATES_TOML = `.crates.${TOML_EXT}`;
export const CONFIG_TOML = `Config.${TOML_EXT}`;

export const FS_OPTIONS = {
  encoding: "utf8",
} as const;

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
.repl_history`;

export const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";

export const MARINE_CARGO_DEPENDENCY = "marine";
export const MREPL_CARGO_DEPENDENCY = "mrepl";
export const AQUA_NPM_DEPENDENCY = "@fluencelabs/aqua";
