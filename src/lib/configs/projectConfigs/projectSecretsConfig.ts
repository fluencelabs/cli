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

import type { JSONSchemaType } from "ajv";

import { SECRETS_FILE_NAME } from "../../const";
import {
  ConfigKeyPair,
  configKeyPairSchema,
} from "../../keyPairs/generateKeyPair";
import { getProjectDotFluenceDir } from "../../pathsGetters/getProjectDotFluenceDir";
import {
  GetDefaultConfig,
  initConfig,
  InitConfigOptions,
  InitializedConfig,
  initReadonlyConfig,
  Migrations,
} from "../initConfig";

type ConfigV0 = {
  version: 0;
  keyPairs: Array<ConfigKeyPair>;
  defaultKeyPair?: ConfigKeyPair;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    keyPairs: {
      type: "array",
      items: configKeyPairSchema,
    },
    defaultKeyPair: { ...configKeyPairSchema, nullable: true },
  },
  required: ["version", "keyPairs"],
};

const getDefaultConfig: GetDefaultConfig<LatestConfig> = (): LatestConfig => ({
  version: 0,
  keyPairs: [],
});

const migrations: Migrations<Config> = [];

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type ProjectSecretsConfig = InitializedConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: SECRETS_FILE_NAME,
  getPath: getProjectDotFluenceDir,
  getDefault: getDefaultConfig,
};

export const initProjectSecretsConfig = initConfig(initConfigOptions);
export const initReadonlyProjectSecretsConfig =
  initReadonlyConfig(initConfigOptions);
