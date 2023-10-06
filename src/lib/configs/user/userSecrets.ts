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

import { ajv, validationErrorToString } from "../../ajvInstance.js";
import {
  AUTO_GENERATED,
  CLI_NAME,
  TOP_LEVEL_SCHEMA_ID,
  USER_SECRETS_CONFIG_FILE_NAME,
  USER_SECRETS_CONFIG_FULL_FILE_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
} from "../../const.js";
import { genSecretKeyStringWithName } from "../../helpers/utils.js";
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
import { type ConfigKeyPair, configKeyPairSchema } from "../keyPair.js";

type ConfigV0 = {
  version: 0;
  keyPairs: Array<ConfigKeyPair>;
  defaultKeyPairName: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
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

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

type ConfigV1 = {
  version: 1;
  secretKeys: Record<string, string>;
  defaultSecretKey: string;
};

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${USER_SECRETS_CONFIG_FULL_FILE_NAME}`,
  title: USER_SECRETS_CONFIG_FULL_FILE_NAME,
  type: "object",
  description: `Defines user's secret keys that can be used across different Fluence projects. You can manage user's keys using commands from \`${CLI_NAME} key\` group of commands with \`--user\` flag`,
  properties: {
    defaultSecretKey: {
      type: "string",
      description: `Secret key with this name will be used for the deployment by default. You can override it with flags or by using keyPair properties in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
    },
    secretKeys: {
      title: "Secret Keys",
      type: "object",
      additionalProperties: { type: "string" },
      properties: {
        secretKey: { type: "string", description: "Secret Key" },
      },
      description: "Secret Keys available for the user",
      required: [],
    },
    version: { type: "number", const: 1 },
  },
  required: ["version", "defaultSecretKey", "secretKeys"],
};

const getDefault: GetDefaultConfig = async () => {
  const { secretKey, name } = await genSecretKeyStringWithName(AUTO_GENERATED);
  return `# Defines user's secret keys that can be used across different Fluence projects.
# You can manage user's keys using commands from \`fluence key\` group of commands with \`--user\` flag

# config version
version: 0

# user's key pairs
secretKeys:
  ${name}: ${secretKey}

# Key pair with this name will be used for the deployment by default.
defaultSecretKey: ${name}
`;
};

const migrations: Migrations<Config> = [
  async (config: Config): Promise<ConfigV1> => {
    if (!validateConfigSchemaV0(config)) {
      throw new Error(
        `Migration error. Errors: ${await validationErrorToString(
          validateConfigSchemaV0.errors,
        )}`,
      );
    }

    return {
      version: 1,
      secretKeys: Object.fromEntries(
        config.keyPairs.map(({ name, secretKey }) => {
          return [name, secretKey];
        }),
      ),
      defaultSecretKey: config.defaultKeyPairName,
    };
  },
];

const validate: ConfigValidateFunction<LatestConfig> = (
  { defaultSecretKey, secretKeys },
  configPath,
) => {
  return defaultSecretKey in secretKeys
    ? true
    : `Default key ${color.yellow(
        defaultSecretKey,
      )} not found at ${configPath}`;
};

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type UserSecretsConfig = InitializedConfig<LatestConfig>;
export type UserSecretsConfigReadonly = InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
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
export const userSecretsSchema: JSONSchemaType<LatestConfig> = configSchemaV1;
