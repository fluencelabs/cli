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

import { CONFIG_FILE_NAME, TOP_LEVEL_SCHEMA_ID } from "../../const.js";
import { ensureUserFluenceDir } from "../../paths.js";
import {
  getConfigInitFunction,
  getReadonlyConfigInitFunction,
  type GetDefaultConfig,
  type InitConfigOptions,
  type InitializedConfig,
  type InitializedReadonlyConfig,
  type Migrations,
} from "../initConfig.js";

type ConfigV0 = {
  version: 0;
  countlyConsent: boolean;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${CONFIG_FILE_NAME}`,
  title: CONFIG_FILE_NAME,
  description: "Defines global config for Fluence CLI",
  properties: {
    countlyConsent: {
      type: "boolean",
      description: "Weather you consent to send usage data to Countly",
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "countlyConsent"],
};

const getDefault: GetDefaultConfig<LatestConfig> = (): LatestConfig => ({
  version: 0,
  countlyConsent: false,
});

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type UserConfig = InitializedConfig<LatestConfig>;
export type UserConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureUserFluenceDir,
};

export const initUserConfig = getConfigInitFunction(initConfigOptions);
export const initNewUserConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault
);
export const initReadonlyUserConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const userConfigSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
