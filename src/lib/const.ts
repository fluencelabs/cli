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

export const FLUENCE_DIR_NAME = ".fluence";
export const SCHEMAS_DIR_NAME = "schemas";
export const SRC_DIR_NAME = "src";
export const ARTIFACTS_DIR_NAME = "artifacts";
export const VSCODE_DIR_NAME = ".vscode";
export const NODE_MODULES_DIR_NAME = "node_modules";

export const CONFIG_FILE_NAME = "config";
export const SECRETS_FILE_NAME = "secrets";
export const DEPLOYED_FILE_NAME = "deployed";

export const GITIGNORE_FILE_NAME = ".gitignore";
export const PACKAGE_JSON_FILE_NAME = "package.json";
export const EXTENSIONS_JSON_FILE_NAME = "extensions.json";
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

export const DEFAULT_KEY_PAIR_NAME = "initial";
export const DEFAULT_KEY_PAIR_NAME_PROPERTY = "defaultKeyPairName";

export const KEY_PAIR_NAME_FLAG = "key-pair-name";

export const KEY_PAIR_FLAG = {
  [KEY_PAIR_NAME_FLAG]: Flags.string({
    char: "k",
    description: "Key pair name",
    helpValue: "<name>",
  }),
} as const;

export type Dependency = {
  name: string;
  version: string;
  bin: string;
};

export const DEPENDENCIES: Record<"aqua", Dependency> = {
  aqua: {
    name: "@fluencelabs/aqua",
    version: "0.7.2-312",
    bin: "aqua",
  },
} as const;

export type CommandObj = Readonly<InstanceType<typeof Command>>;

export const GIT_IGNORE_CONTENT = `# recommended by Fluence Labs:
.idea
.DS_Store
.vscode
.fluence/secrets.json
**/node_modules
Cargo.lock
**/target/
**/artifacts/*.wasm
.repl_history`;
