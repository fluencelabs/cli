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

import type { JSONSchemaType } from "ajv";

import {
  GLOBAL_CONFIG_FILE_NAME,
  GLOBAL_CONFIG_FULL_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
  CLI_NAME_FULL,
} from "../../const.js";
import {
  validateAllVersionsAreExact,
  validateBatch,
} from "../../helpers/validations.js";
import { ensureUserFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type GetDefaultConfig,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
  type ConfigValidateFunction,
} from "../initConfig.js";

export const CHECK_FOR_UPDATES_DISABLED = "disabled";

type ConfigV0 = {
  version: 0;
  countlyConsent: boolean;
  dependencies?: {
    npm?: Record<string, string>;
    cargo?: Record<string, string>;
  };
  lastCheckForUpdates?: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${GLOBAL_CONFIG_FULL_FILE_NAME}`,
  title: GLOBAL_CONFIG_FULL_FILE_NAME,
  description: `Defines global config for ${CLI_NAME_FULL}`,
  properties: {
    countlyConsent: {
      type: "boolean",
      description: "Weather you consent to send usage data to Countly",
    },
    dependencies: {
      type: "object",
      description: "(For advanced users) Global overrides of dependencies",
      properties: {
        npm: {
          type: "object",
          description: "Overrides of npm dependencies",
          additionalProperties: { type: "string" },
          properties: {
            npm_dependency_name: {
              type: "string",
              description: "npm dependency version",
            },
          },
          nullable: true,
          required: [],
        },
        cargo: {
          type: "object",
          description: "Overrides of cargo dependencies",
          additionalProperties: { type: "string" },
          properties: {
            Cargo_dependency_name: {
              type: "string",
              description: "cargo dependency version",
            },
          },
          nullable: true,
          required: [],
        },
      },
      nullable: true,
      required: [],
    },
    lastCheckForUpdates: {
      type: "string",
      description: `Last time when ${CLI_NAME_FULL} checked for updates. Updates are checked daily unless this field is set to '${CHECK_FOR_UPDATES_DISABLED}'`,
      nullable: true,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "countlyConsent"],
};

const getDefault: GetDefaultConfig = () => {
  return `# Defines global config for Fluence CLI

# Weather you consent to send usage data to Countly
countlyConsent: false

# config version
version: 0

# # Last time when CLI checked for updates.
# # Updates are checked daily unless this field is set to 'disabled'
# lastCheckForUpdates: 2023-07-07T09:31:00.961Z

# # (For advanced users) Overrides for the marine and mrepl dependencies and enumerates npm aqua dependencies globally
# # You can check out current project dependencies using \`fluence dep v\` command
# dependencies:
#   # A map of npm dependency versions
#   # CLI ensures dependencies are installed each time you run aqua
#   # There are also some dependencies that are installed by default (e.g. @fluencelabs/aqua-lib)
#   # You can check default dependencies using \`fluence dep v --default\`
#   # use \`fluence dep npm i --global\` to install global npm dependencies
#   npm:
#     "@fluencelabs/aqua-lib": 0.7.1
#
#   # A map of cargo dependency versions
#   # CLI ensures dependencies are installed each time you run commands that depend on Marine or Marine REPL
#   # use \`fluence dep cargo i --global\` to install global cargo dependencies
#   cargo:
#     marine: 0.14.0
`;
};

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type UserConfig = InitializedConfig<LatestConfig>;
export type UserConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const validate: ConfigValidateFunction<LatestConfig> = (config) => {
  return validateBatch(
    validateAllVersionsAreExact(config.dependencies?.npm ?? {}),
    validateAllVersionsAreExact(config.dependencies?.cargo ?? {}),
  );
};

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: GLOBAL_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureUserFluenceDir,
  validate,
};

export const initUserConfig = getConfigInitFunction(initConfigOptions);
export const initNewUserConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault,
);
export const initReadonlyUserConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const userConfigSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
export let userConfig: UserConfig;

export const setUserConfig = (newUserConfig: UserConfig) => {
  userConfig = newUserConfig;
};
