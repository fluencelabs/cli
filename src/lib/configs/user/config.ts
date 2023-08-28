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
import { yamlDiffPatch } from "yaml-diff-patch";

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
  docsInConfigs?: boolean;
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
    docsInConfigs: {
      type: "boolean",
      description:
        "Whether to include commented-out documented config examples in the configs generated with the CLI",
      nullable: true,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "countlyConsent"],
};

const getDefault: GetDefaultConfig = () => {
  const config: ConfigV0 = {
    countlyConsent: false,
    version: 0,
  };

  // This config will always be without any additional comments
  // Because it defines whether configs should have comments or not by itself
  return `${yamlDiffPatch("", {}, config)}\n`;
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
