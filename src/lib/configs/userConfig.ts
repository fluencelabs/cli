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

import Ajv, { JSONSchemaType } from "ajv";

import {
  DEFAULT_KEY_PAIR_NAME,
  CONFIG_FILE_NAME,
  DEFAULT_KEY_PAIR_NAME_PROPERTY,
} from "../const";

import { UpdateConfig, getConfig } from "./ensureConfig";

const ajv = new Ajv();

type Config0 = {
  version: 0;
  [DEFAULT_KEY_PAIR_NAME_PROPERTY]: string;
};

type UserConfig = Config0;

const getDefaultConfig = (): UserConfig => ({
  version: 0,
  [DEFAULT_KEY_PAIR_NAME_PROPERTY]: DEFAULT_KEY_PAIR_NAME,
});

const configSchema0: JSONSchemaType<Config0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    [DEFAULT_KEY_PAIR_NAME_PROPERTY]: { type: "string" },
  },
  required: ["version", DEFAULT_KEY_PAIR_NAME_PROPERTY],
};

const configSchema: JSONSchemaType<UserConfig> = {
  oneOf: [configSchema0],
} as const;

const validateConfig = ajv.compile(configSchema);

const migrations: Array<(config: UserConfig) => UserConfig> = [];

export const getUserConfig = async (
  configDir: string
): Promise<[UserConfig, UpdateConfig<UserConfig>] | Error> =>
  getConfig({
    configName: CONFIG_FILE_NAME,
    configDir,
    migrations,
    validateConfig,
    getDefaultConfig,
  });
