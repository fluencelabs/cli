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

import { color } from "@oclif/color";
import type { JSONSchemaType } from "ajv";

import {
  AUTO_GENERATED,
  CLI_NAME,
  TOP_LEVEL_SCHEMA_ID,
  USER_SECRETS_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
import { generateKeyPair } from "../../helpers/generateKeyPair.js";
import {
  validateHasDefault,
  validateBatch,
  validateUnique,
  type ValidationResult,
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
} from "../initConfig.js";
import { type ConfigKeyPair, configKeyPairSchema } from "../keyPair.js";

type ConfigV0 = {
  version: 0;
  keyPairs: Array<ConfigKeyPair>;
  defaultKeyPairName: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  $id: `${TOP_LEVEL_SCHEMA_ID}/${USER_SECRETS_CONFIG_FULL_FILE_NAME}`,
  title: USER_SECRETS_CONFIG_FULL_FILE_NAME,
  description: `Defines user's secret keys that can be used across different Fluence projects. You can manage user's keys using commands from \`${CLI_NAME} key\` group of commands with \`--user\` flag`,
  properties: {
    defaultKeyPairName: { type: "string" },
    keyPairs: {
      title: "Key Pairs",
      type: "array",
      items: configKeyPairSchema,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "keyPairs", "defaultKeyPairName"],
};

const getDefault: GetDefaultConfig = async () => {
  const { secretKey, name } = await generateKeyPair(AUTO_GENERATED);
  return `# Defines user's secret keys that can be used across different Fluence projects.
# You can manage user's keys using commands from \`fluence key\` group of commands with \`--user\` flag

# user's key pairs
keyPairs:
  - name: ${name}
    secretKey: ${secretKey}

# Key pair with this name will be used for the deployment by default.
defaultKeyPairName: ${name}

# config version
version: 0
`;
};

const migrations: Migrations<Config> = [];

const validate = (config: LatestConfig): ValidationResult => {
  return validateBatch(
    validateUnique(
      config.keyPairs,
      ({ name }): string => {
        return name;
      },
      (name): string => {
        return `There are multiple key-pairs with the same name ${color.yellow(
          name,
        )}`;
      },
    ),
    validateHasDefault(
      config.keyPairs,
      config.defaultKeyPairName,
      ({ name }): string => {
        return name;
      },
      `Default key-pair ${color.yellow(config.defaultKeyPairName)} not found`,
    ),
  );
};

type Config = ConfigV0;
type LatestConfig = ConfigV0;
export type UserSecretsConfig = InitializedConfig<LatestConfig>;
export type UserSecretsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0],
  latestSchema: configSchemaV0,
  migrations,
  name: USER_SECRETS_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: ensureUserFluenceDir,
  validate,
};

export const initUserSecretsConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault,
);
export const initReadonlyUserSecretsConfig = getReadonlyConfigInitFunction(
  initConfigOptions,
  getDefault,
);
export const userSecretsSchema: JSONSchemaType<LatestConfig> = configSchemaV0;
