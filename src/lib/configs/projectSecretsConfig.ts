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

import { SECRETS_FILE_NAME } from "../const";
import {
  ConfigKeyPair,
  configKeyPairSchema,
} from "../keyPairs/generateKeyPair";

import { UpdateConfig, getConfig } from "./ensureConfig";

const ajv = new Ajv();

type Config0 = {
  version: 0;
  secrets: Array<ConfigKeyPair>;
};

export type ProjectSecretsConfig = Config0;

const getDefaultConfig = (): ProjectSecretsConfig => ({
  version: 0,
  secrets: [],
});

const configSchema0: JSONSchemaType<Config0> = {
  type: "object",
  properties: {
    version: { type: "number", enum: [0] },
    secrets: {
      type: "array",
      items: configKeyPairSchema,
    },
  },
  required: ["version", "secrets"],
};

const configSchema: JSONSchemaType<ProjectSecretsConfig> = {
  oneOf: [configSchema0],
} as const;

const validateConfig = ajv.compile(configSchema);

const migrations: Array<
  (config: ProjectSecretsConfig) => ProjectSecretsConfig
> = [];

export const getMaybeProjectSecretsConfig = async (
  configDir: string
): Promise<
  [ProjectSecretsConfig, UpdateConfig<ProjectSecretsConfig>] | Error
> =>
  getConfig({
    configName: SECRETS_FILE_NAME,
    configDir,
    migrations,
    validateConfig,
    getDefaultConfig,
  });
