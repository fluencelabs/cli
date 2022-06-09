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

export const AQUA_EXT = "aqua";

export const FLUENCE_DIR_NAME = ".fluence";
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const ARTIFACTS_DIR_NAME = "artifacts";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";
export const AQUA_DIR_NAME = "aqua";
export const DEFAULT_AQUA_DIR_NAME = "aqua";

export const APP_PROTOTYPE_FILE_NAME = "fluence";
export const SECRETS_FILE_NAME = "secrets";
export const APP_FILE_NAME = "app";

export const APP_SERVICES_AQUA_FILE_NAME = `app.services.${AQUA_EXT}`;
export const DEFAULT_SRC_AQUA_FILE_NAME = `main.${AQUA_EXT}`;
export const INTERFACES_AQUA_FILE_NAME = `interfaces.${AQUA_EXT}`;

export const GITIGNORE_FILE_NAME = ".gitignore";
export const PACKAGE_JSON_FILE_NAME = "package.json";
export const EXTENSIONS_JSON_FILE_NAME = "extensions.json";
export const SETTINGS_JSON_FILE_NAME = "settings.json";
export const DEPLOYMENT_CONFIG_FILE_NAME = "deploy.json";

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

export const KEY_PAIR_NAME_FLAG = "key-pair-name";

export const AUTO_GENERATED = "auto-generated";

export const KEY_PAIR_FLAG = {
  [KEY_PAIR_NAME_FLAG]: Flags.string({
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
};

export const FORCE_FLAG_NAME = "force";

export const NAME_ARG = "NAME";

export type Dependency = {
  name: string;
  version: string;
  bin: string;
};

export const DEPENDENCIES: Record<"aqua", Dependency> = {
  aqua: {
    name: "@fluencelabs/aqua",
    version: "0.7.2-314",
    bin: "aqua",
  },
} as const;

export type CommandObj = Readonly<InstanceType<typeof Command>>;

export const GIT_IGNORE_CONTENT = `.idea
.DS_Store
.fluence
/schemas
**/node_modules
Cargo.lock
**/target/
.repl_history`;

export const APP_SERVICES_AQUA = `data DeployedService:
  serviceId: string
  peerId: string
  blueprintId: string
  name: string

alias App : []DeployedService
`;

export const IS_TTY = process.stdout.isTTY && process.stdin.isTTY;
export const IS_DEVELOPMENT = process.env["NODE_ENV"] === "development";
