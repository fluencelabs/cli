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
import type { stringify } from "yaml";

export const AQUA_RECOMMENDED_VERSION = "0.7.4-329";

export const AQUA_EXT = "aqua";
export const TS_EXT = "ts";
export const JS_EXT = "js";
export const JSON_EXT = "json";
export const YAML_EXT = "yaml";

export const FLUENCE_DIR_NAME = ".fluence";
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const TMP_DIR_NAME = "tmp";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";
export const AQUA_DIR_NAME = "aqua";
export const TS_DIR_NAME = "ts";
export const JS_DIR_NAME = "js";

export const FLUENCE_CONFIG_FILE_NAME = "fluence";
export const SECRETS_FILE_NAME = "secrets";
export const DEPENDENCY_FILE_NAME = "dependency";
export const MODULE_FILE_NAME = "module";
export const SERVICE_FILE_NAME = "service";
export const APP_FILE_NAME = "app";

const DEPLOYED_APP_FILE_NAME = "deployed.app";

export const DEPLOYED_APP_AQUA_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${AQUA_EXT}`;
export const DEFAULT_SRC_AQUA_FILE_NAME = `main.${AQUA_EXT}`;
export const INTERFACES_AQUA_FILE_NAME = `interfaces.${AQUA_EXT}`;

export const GITIGNORE_FILE_NAME = ".gitignore";

export const PACKAGE_JSON_FILE_NAME = `package.${JSON_EXT}`;
export const EXTENSIONS_JSON_FILE_NAME = `extensions.${JSON_EXT}`;
export const SETTINGS_JSON_FILE_NAME = `settings.${JSON_EXT}`;
export const DEPLOYMENT_CONFIG_FILE_NAME = `deploy.${JSON_EXT}`;
export const APP_SERVICE_JSON_FILE_NAME = `app-service.${JSON_EXT}`;

export const APP_TS_FILE_NAME = `app.${TS_EXT}`;
export const APP_JS_FILE_NAME = `app.${JS_EXT}`;
export const DEPLOYED_APP_TS_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${TS_EXT}`;
export const DEPLOYED_APP_JS_FILE_NAME = `${DEPLOYED_APP_FILE_NAME}.${JS_EXT}`;

export const FS_OPTIONS = {
  encoding: "utf8",
} as const;

export const YAML_FORMAT: [
  Parameters<typeof stringify>[1],
  Parameters<typeof stringify>[2]
] = [
  null,
  {
    doubleQuotedAsJSON: true,
  },
];

export const AUTO_GENERATED = "auto-generated";

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
  [TIMEOUT_FLAG_NAME]: Flags.string({
    description: "Timeout used for command execution",
    helpValue: "<milliseconds>",
  }),
} as const;

export const FORCE_FLAG_NAME = "force";

export type CommandObj = Readonly<InstanceType<typeof Command>>;

export const GIT_IGNORE_CONTENT = `.idea
.DS_Store
.fluence
**/node_modules
Cargo.lock
**/target/
.vscode/settings.json
.repl_history`;

export const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";
