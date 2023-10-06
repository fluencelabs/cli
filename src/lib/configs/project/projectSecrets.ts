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
  CLI_NAME,
  FLUENCE_CONFIG_FULL_FILE_NAME,
  PROJECT_SECRETS_CONFIG_FILE_NAME,
  PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  TOP_LEVEL_SCHEMA_ID,
} from "../../const.js";
import { getFluenceDir } from "../../paths.js";
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
  defaultKeyPairName?: string;
};

const configSchemaV0: JSONSchemaType<ConfigV0> = {
  type: "object",
  properties: {
    keyPairs: {
      title: "Key Pairs",
      description: "Key Pairs available for the particular project",
      type: "array",
      items: configKeyPairSchema,
    },
    defaultKeyPairName: {
      type: "string",
      nullable: true,
      description: `Key pair with this name will be used for the deployment by default. You can override it with flags or by using keyPair properties in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
    },
    version: { type: "number", const: 0 },
  },
  required: ["version", "keyPairs"],
};

const validateConfigSchemaV0 = ajv.compile(configSchemaV0);

type ConfigV1 = {
  version: 1;
  secretKeys?: Record<string, string>;
  defaultSecretKey?: string;
};

const configSchemaV1: JSONSchemaType<ConfigV1> = {
  $id: `${TOP_LEVEL_SCHEMA_ID}/${PROJECT_SECRETS_FULL_CONFIG_FILE_NAME}`,
  title: PROJECT_SECRETS_FULL_CONFIG_FILE_NAME,
  type: "object",
  description: `Defines project's secret keys that are used only in the scope of this particular Fluence project. You can manage project's keys using commands from \`${CLI_NAME} key\` group of commands`,
  properties: {
    defaultSecretKey: {
      type: "string",
      nullable: true,
      description: `Secret key with this name will be used for the deployment by default. You can override it with flags or by using keyPair properties in ${FLUENCE_CONFIG_FULL_FILE_NAME}`,
    },
    secretKeys: {
      nullable: true,
      title: "Secret Keys",
      type: "object",
      additionalProperties: { type: "string" },
      properties: {
        secretKey: { type: "string", description: "Secret Key" },
      },
      description: "Secret Keys available for the particular project",
      required: [],
    },
    version: { type: "number", const: 1 },
  },
  required: ["version"],
};

const getDefault: GetDefaultConfig = () => {
  return `# Defines project's secret keys that are used only in the scope of this particular Fluence project.
# You can manage project's keys using commands from \`fluence key\` group of commands

# config version
version: 0

# Key Pairs available for your fluence project
# secretKeys:
#   mySecretKey: y5MU5/jpyGGDFlDdJa+UCSkWKNr8iGtb6bRiytc/M54=

# Key pair with this name will be used for the deployment by default.
# You can override it with flags or by using keyPair properties in fluence.yaml
# defaultSecretKey: mySecretKey
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
      ...(config.defaultKeyPairName === undefined
        ? {}
        : { defaultSecretKey: config.defaultKeyPairName }),
    };
  },
];

const validate: ConfigValidateFunction<LatestConfig> = (
  { defaultSecretKey, secretKeys },
  configPath,
) => {
  if (defaultSecretKey === undefined || secretKeys === undefined) {
    return true;
  }

  return defaultSecretKey in secretKeys
    ? true
    : `Default key ${color.yellow(
        defaultSecretKey,
      )} not found at ${configPath}`;
};

type Config = ConfigV0 | ConfigV1;
type LatestConfig = ConfigV1;
export type ProjectSecretsConfig = InitializedConfig<LatestConfig>;
export type ProjectSecretsConfigReadonly =
  InitializedReadonlyConfig<LatestConfig>;

const initConfigOptions: InitConfigOptions<Config, LatestConfig> = {
  allSchemas: [configSchemaV0, configSchemaV1],
  latestSchema: configSchemaV1,
  migrations,
  name: PROJECT_SECRETS_CONFIG_FILE_NAME,
  getConfigOrConfigDirPath: getFluenceDir,
  validate,
};

export const initNewProjectSecretsConfig = getConfigInitFunction(
  initConfigOptions,
  getDefault,
);
export const initNewReadonlyProjectSecretsConfig =
  getReadonlyConfigInitFunction(initConfigOptions, getDefault);

export const initReadonlyProjectSecretsConfig =
  getReadonlyConfigInitFunction(initConfigOptions);

export const projectSecretsSchema: JSONSchemaType<LatestConfig> =
  configSchemaV1;
